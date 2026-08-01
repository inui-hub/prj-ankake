import { coordinateKey } from "./board";
import { querySummonStart } from "./summon";
import type {
  BattleCardInstance,
  BattleSide,
  BattleState,
  BoardCoordinate,
  BoardTerrain,
  BattleLane
} from "./types";

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
  readonly occupant?: BattleCardView;
}

export interface PublicBattleView {
  readonly phase: BattleState["phase"];
  readonly activeSide: BattleSide;
  readonly turnNumber: number;
  readonly playerBaseHp: number;
  readonly cpuBaseHp: number;
  readonly playerCurrentPp: number;
  readonly playerMaxPp: number;
  readonly cpuHandCount: number;
  readonly playerDeckCount: number;
  readonly cpuDeckCount: number;
  readonly playerHand: readonly BattleCardView[];
  readonly boardSquares: readonly BattleBoardSquareView[];
  readonly terminalResult: BattleState["terminalResult"];
}

export function projectPublicBattleView(state: BattleState): PublicBattleView {
  return {
    phase: state.phase,
    activeSide: state.activeSide,
    turnNumber: state.metadata.turnNumber,
    playerBaseHp: state.players.player.baseHp,
    cpuBaseHp: state.players.cpu.baseHp,
    playerCurrentPp: state.players.player.currentPp,
    playerMaxPp: state.players.player.maxPp,
    cpuHandCount: state.players.cpu.handZone.length,
    playerDeckCount: state.players.player.deckZone.length,
    cpuDeckCount: state.players.cpu.deckZone.length,
    playerHand: state.players.player.handZone.map((instanceId) =>
      projectBattleCard(instanceId, state.cardInstances[instanceId], "hand", state)
    ),
    boardSquares: state.board.squares.map((square) => ({
      key: coordinateKey(square.coordinate),
      coordinate: square.coordinate,
      lane: square.lane,
      terrain: square.terrain,
      occupant: square.occupantId
        ? projectBattleCard(
            square.occupantId,
            state.cardInstances[square.occupantId],
            "board"
          )
        : undefined
    })),
    terminalResult: state.terminalResult
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
      ownerLabel: "Unknown"
    };
  }

  const isCreature = card.type === "creature" || card.type === "creature-token";
  const summonStart =
    location === "hand" && isCreature && state
      ? querySummonStart(state, "player", card.instanceId)
      : undefined;
  const isActionable = summonStart?.eligible ?? false;
  const disabledReason =
    card.type === "spell"
      ? "Spell effects are planned for a later cycle."
      : location === "hand"
        ? summonStart?.issues[0]?.message
        : "Creature movement is planned for a later unit.";

  return {
    instanceId: card.instanceId,
    catalogCardId: card.catalogCardId,
    name: card.name,
    type: card.type,
    attribute: card.attribute,
    controllerSide: card.controllerSide,
    presentationStatus: "available",
    ...(location === "hand" ? { currentCost: Math.max(0, card.currentCost) } : {}),
    ...(isCreature
      ? {
          currentAttack: card.currentAttack ?? card.attack,
          currentHp: card.currentHp,
          maxHp: card.maxHp,
          movement: Math.max(0, card.movement),
          ...(location === "board"
            ? {
                summonedThisTurn: card.summonedThisTurn,
                movedThisTurn: card.movedThisTurn
              }
            : {})
        }
      : {}),
    isInspectable: true,
    isActionable,
    disabledReason,
    ownerLabel: labelSide(card.controllerSide)
  };
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
