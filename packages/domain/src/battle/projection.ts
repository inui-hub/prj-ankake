import { coordinateKey } from "./board";
import {
  BATTLE_BASE_IDS,
  getBattleBaseAt,
  getBattleBaseLabel
} from "./bases";
import { queryMovementStart } from "./movement";
import { getEffectiveCreatureAttack, getEffectiveCreatureCurrentHp, getEffectiveCreatureMaxHp, getEffectiveCreatureMovement } from "./resonance";
import { querySummonStart } from "./summon";
import { validateBattleCommand } from "./validation";
import { getEffectChoiceForCard, getPublicEffectChoices } from "./legalActions";
import type {
  BattleCardInstance,
  BattleBaseId,
  BattleBaseKind,
  BattleBaseOwner,
  BattleBaseState,
  BattleSide,
  BattleState,
  BoardCoordinate,
  BoardTerrain,
  BattleLane
} from "./types";
import type { ResonanceMap } from "./types";

export type BattleCardViewType = BattleCardInstance["type"] | "unknown";
export type BattleCardViewAttribute = BattleCardInstance["attribute"] | "unknown";
export type BattleCardViewController = BattleSide | "unknown";

export interface BattleCardView {
  readonly instanceId: string;
  readonly catalogCardId: string;
  readonly name: string;
  readonly type: BattleCardViewType;
  readonly attribute: BattleCardViewAttribute;
  readonly controllerSide: BattleCardViewController;
  readonly presentationStatus: "available" | "unavailable";
  readonly currentCost?: number;
  readonly currentAttack?: number;
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly movement?: number;
  /** Presentation-only card rules text. It never drives battle execution. */
  readonly effectText: string;
  readonly summonedThisTurn?: boolean;
  readonly movedThisTurn?: boolean;
  readonly isInspectable: boolean;
  readonly isActionable: boolean;
  readonly disabledReason?: string;
  readonly ownerLabel: string;
}

export interface BattleBoardSquareView {
  readonly key: string;
  readonly coordinate: BoardCoordinate;
  readonly lane: BattleLane;
  readonly terrain: BoardTerrain;
  readonly base?: BattleBaseView;
  readonly occupant?: BattleCardView;
}

export interface BattleBaseView {
  readonly id: BattleBaseId;
  readonly label: string;
  readonly coordinate: BoardCoordinate;
  readonly kind: BattleBaseKind;
  readonly owner: BattleBaseOwner;
  readonly currentHp: number;
  readonly maxHp: number;
}

export interface PublicBattleView {
  readonly phase: BattleState["phase"];
  readonly activeSide: BattleSide;
  readonly turnNumber: number;
  readonly bases: readonly BattleBaseView[];
  readonly playerCurrentPp: number;
  readonly playerMaxPp: number;
  readonly playerResonance: ResonanceMap;
  readonly cpuHandCount: number;
  readonly playerDeckCount: number;
  readonly cpuDeckCount: number;
  readonly playerHand: readonly BattleCardView[];
  readonly effectChoices: readonly import("./types").PublicEffectChoice[];
  readonly boardSquares: readonly BattleBoardSquareView[];
  readonly terminalResult: BattleState["terminalResult"];
}

export function projectPublicBattleView(state: BattleState): PublicBattleView {
  const bases = BATTLE_BASE_IDS.map((id) => projectBattleBaseView(state.bases[id]));
  const basesById = new Map(bases.map((base) => [base.id, base]));

  return {
    phase: state.phase,
    activeSide: state.activeSide,
    turnNumber: state.metadata.turnNumber,
    bases,
    playerCurrentPp: state.players.player.currentPp,
    playerMaxPp: state.players.player.maxPp,
    playerResonance: state.players.player.resonance,
    cpuHandCount: state.players.cpu.handZone.length,
    playerDeckCount: state.players.player.deckZone.length,
    cpuDeckCount: state.players.cpu.deckZone.length,
    playerHand: state.players.player.handZone.map((instanceId) =>
      projectBattleCard(instanceId, state.cardInstances[instanceId], "hand", state)
    ),
    effectChoices: getPublicEffectChoices(state, "player"),
    boardSquares: state.board.squares.map((square) => {
      const base = getBattleBaseAt(state.bases, square.coordinate);
      return {
        key: coordinateKey(square.coordinate),
        coordinate: square.coordinate,
        lane: square.lane,
        terrain: square.terrain,
        base: base ? basesById.get(base.id) : undefined,
        occupant: square.occupantId
          ? projectBattleCard(
            square.occupantId,
            state.cardInstances[square.occupantId],
            "board",
            state
          )
        : undefined
      };
    }),
    terminalResult: state.terminalResult
  };
}

export function projectBattleBaseView(base: BattleBaseState): BattleBaseView {
  return {
    id: base.id,
    label: getBattleBaseLabel(base.id),
    coordinate: { ...base.coordinate },
    kind: base.kind,
    owner: base.owner,
    currentHp: base.currentHp,
    maxHp: base.maxHp
  };
}

function projectBattleCard(
  instanceId: string,
  card: BattleCardInstance | undefined,
  location: "hand" | "board",
  state?: BattleState
): BattleCardView {
  if (!card) {
    return {
      instanceId,
      catalogCardId: `unknown-${instanceId}`,
      name: "Unknown card",
      type: "unknown",
      attribute: "unknown",
      controllerSide: "unknown",
      presentationStatus: "unavailable",
      isInspectable: true,
      isActionable: false,
      disabledReason: "Card data is unavailable.",
      effectText: "",
      ownerLabel: "Unknown"
    };
  }

  const isCreature = card.type === "creature" || card.type === "creature-token";
  const summonStart =
    location === "hand" && isCreature && state
      ? querySummonStart(state, "player", card.instanceId)
      : undefined;
  const movementStart =
    location === "board" && isCreature && state
      ? queryMovementStart(state, "player", card.instanceId)
      : undefined;
  const spellIssues =
    location === "hand" && card.type === "spell" && state
      ? validateBattleCommand(state, {
          type: "castSpell",
          side: "player",
          handInstanceId: card.instanceId
        })
      : undefined;
  const spellChoice =
    location === "hand" && card.type === "spell" && state
      ? getEffectChoiceForCard(state, "player", card)
      : undefined;
  const spellIsActionable = spellIssues !== undefined && (
    spellIssues.length === 0 || Boolean(
      spellIssues.every((issue) => issue.code === "battle.effect.no-target") &&
      spellChoice &&
      spellChoice.candidates.length > 0
    )
  );
  const isActionable =
    spellIssues !== undefined
      ? spellIsActionable
      : summonStart?.eligible ?? movementStart?.eligible ?? false;
  const disabledReason =
    card.type === "spell"
      ? spellIsActionable ? undefined : spellIssues?.[0]?.code
      : location === "hand"
        ? summonStart?.issues[0]?.code
        : movementStart?.issues[0]?.code;

  return {
    instanceId: card.instanceId,
    catalogCardId: card.catalogCardId,
    name: card.name,
    type: card.type,
    attribute: card.attribute,
    controllerSide: card.controllerSide,
    presentationStatus: "available",
    currentCost: Math.max(0, card.currentCost),
    ...(isCreature
      ? {
          // Resonance bonuses are derived from the current battle state so a
          // lane change or resonance decay is reflected without mutating the
          // card's persistent base/current attack.
          currentAttack: state
            ? getEffectiveCreatureAttack(state, card)
            : card.currentAttack ?? card.attack,
          currentHp: state ? getEffectiveCreatureCurrentHp(state, card) : card.currentHp,
          maxHp: state ? getEffectiveCreatureMaxHp(state, card) : card.maxHp,
          // The water resonance bonus is a temporary derived value, like the
          // fire attack bonus.  Project it so both the card display and any
          // caller using the public view see the actual movement limit.
          movement: state ? getEffectiveCreatureMovement(state, card) : Math.max(0, card.movementOverride ?? card.movement + (card.temporaryMovementBonus ?? 0)),
          ...(location === "board"
            ? {
                summonedThisTurn: card.summonedThisTurn,
                movedThisTurn: card.movedThisTurn
              }
            : {})
        }
      : {}),
    isInspectable: true,
    effectText: card.effectText,
    isActionable,
    disabledReason,
    ownerLabel: labelSide(card.controllerSide)
  };
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
