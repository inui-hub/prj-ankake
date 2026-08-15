import { validateMovementPath } from "./movement";
import { getLane } from "./board";
import { getCreaturePlayCost, isResonanceActive } from "./resonance";
import { validateSummonDestination, validateSummonSource } from "./summon";
import { getExecutablePlayEffects } from "./effectPrograms";
import { getLegalEffectTargets } from "./effectResolver";
import { isCardEffectScriptSupported } from "./cardEffectRuntime";
import type {
  BattleCardInstance,
  BattleCommand,
  BattleState,
  BattleValidationIssue
} from "./types";

export function validateBattleCommand(
  state: BattleState,
  command: BattleCommand
): readonly BattleValidationIssue[] {
  const commonIssues = validateCommon(state, command);
  if (commonIssues.length > 0) {
    return commonIssues;
  }

  switch (command.type) {
    case "summonCreature":
      return validateSummon(state, command);
    case "castSpell":
      return validateSpell(state, command);
    case "moveCreature":
      return validateMove(state, command);
    case "boostCreatureMovement":
      return validateWaterBoost(state, command);
    case "endPlayPhase":
      return [];
  }
}

export function getFirstValidationMessage(issues: readonly BattleValidationIssue[]): string {
  return issues[0]?.message ?? "Command is not legal.";
}

function validateCommon(
  state: BattleState,
  command: BattleCommand
): readonly BattleValidationIssue[] {
  if (state.phase === "terminal" || state.terminalResult) {
    return [
      {
        code: "battle.terminal",
        message: "The battle has already ended."
      }
    ];
  }

  if (state.phase !== "play") {
    return [
      {
        code: "battle.phase.invalid",
        message: "Battle commands can be confirmed only during a play phase."
      }
    ];
  }

  if (state.activeSide !== command.side) {
    return [
      {
        code: "battle.side.inactive",
        message: "It is not this side's turn."
      }
    ];
  }

  return [];
}

function validateSummon(
  state: BattleState,
  command: Extract<BattleCommand, { type: "summonCreature" }>
): readonly BattleValidationIssue[] {
  const sourceIssues = validateSummonSource(state, command.side, command.handInstanceId);
  if (sourceIssues.length > 0) {
    return sourceIssues;
  }

  const destinationIssues = validateSummonDestination(state, command.side, command.destination);
  if (destinationIssues.length > 0) return destinationIssues;
  const card = state.cardInstances[command.handInstanceId] as BattleCardInstance;
  const cost = getCreaturePlayCost(state, command.side, card, getLane(command.destination.column));
  if (cost > state.players[command.side].currentPp) return [{
    code: "battle.resource.pp-insufficient",
    message: "Not enough PP to play this creature.",
    path: "currentPp"
  }];
  const counts: Readonly<Record<string, number>> = { "AK-038": 1, "AK-042": 1, "AK-046": 2, "AK-048": 3, "AK-057": 1 };
  const count = counts[card.catalogCardId];
  if (!count) return [];
  const selection = command.effectSelection; const coordinates = selection?.coordinates ?? [];
  const validCell = (coordinate: { column: number; row: number }) => {
    const square = state.board.squares.find((candidate) => candidate.coordinate.column === coordinate.column && candidate.coordinate.row === coordinate.row);
    if (!square || square.terrain !== "normal" || square.occupantId || (coordinate.column === command.destination.column && coordinate.row === command.destination.row)) return false;
    return card.catalogCardId === "AK-038" || card.catalogCardId === "AK-057"
      ? Math.abs(coordinate.column - command.destination.column) <= 1 && Math.abs(coordinate.row - command.destination.row) <= 1
      : square.lane === getLane(command.destination.column);
  };
  const graveyardTarget = selection?.graveyardCardIds?.[0];
  const graveyardCard = graveyardTarget ? state.cardInstances[graveyardTarget] : undefined;
  const graveyardOk = card.catalogCardId !== "AK-057" || Boolean(selection?.graveyardCardIds?.length === 1 && graveyardTarget && state.players[command.side].graveyardZone.includes(graveyardTarget) && graveyardCard && (graveyardCard.type === "creature" || graveyardCard.type === "creature-token") && graveyardCard.cost <= 3);
  return coordinates.length === count && new Set(coordinates.map((coordinate) => `${coordinate.column}:${coordinate.row}`)).size === count && coordinates.every(validCell) && graveyardOk ? [] : invalidSelection("Select the required legal effect targets before summoning.");
}

function validateSpell(
  state: BattleState,
  command: Extract<BattleCommand, { type: "castSpell" }>
): readonly BattleValidationIssue[] {
  const card = state.cardInstances[command.handInstanceId];
  const issues = validateHandCard(state, command.side, card, "spell");

  if (issues.length > 0) {
    return issues;
  }

  const player = state.players[command.side];

  if ((card as BattleCardInstance).currentCost > player.currentPp) {
    return [
      {
        code: "battle.resource.pp-insufficient",
        message: "Not enough PP to cast this spell.",
        path: "currentPp"
      }
    ];
  }

  const effect = getExecutablePlayEffects(card as BattleCardInstance)[0];
  if (!effect) return [];
  const operation = effect.operations[0];
  if (operation?.kind === "card-script") {
    if (!isCardEffectScriptSupported((card as BattleCardInstance).catalogCardId)) {
      return [{ code: "battle.effect.unsupported", message: "This card effect has no executable program.", path: "effectSelection" }];
    }
    return validateScriptedSpellSelection(state, command, card as BattleCardInstance);
  }
  const selected = command.targetInstanceId
    ? { kind: "creature" as const, instanceId: command.targetInstanceId }
    : command.targetBaseId
      ? { kind: "base" as const, baseId: command.targetBaseId }
      : undefined;
  if (!selected) return [{ code: "battle.effect.no-target", message: "This spell requires a legal target.", path: "target" }];
  const legal = operation ? getLegalEffectTargets(state, command.side, operation) : [];
  const isLegal = legal.some((target) => target.kind === selected.kind && (target.kind === "creature" ? target.instanceId === selected.instanceId : target.baseId === selected.baseId));
  return isLegal ? [] : [{ code: "battle.effect.no-target", message: "The selected spell target is no longer legal.", path: "target" }];
}

function validateScriptedSpellSelection(
  state: BattleState,
  command: Extract<BattleCommand, { type: "castSpell" }>,
  card: BattleCardInstance
): readonly BattleValidationIssue[] {
  const selection = command.effectSelection;
  const ids = selection?.graveyardCardIds ?? [];
  const coordinates = selection?.coordinates ?? [];
  const player = state.players[command.side];
  const uniqueCoordinates = new Set(coordinates.map((coordinate) => `${coordinate.column}:${coordinate.row}`));
  const emptyNormal = (coordinate: { column: number; row: number }) => state.board.squares.some((square) => square.coordinate.column === coordinate.column && square.coordinate.row === coordinate.row && square.terrain === "normal" && !square.occupantId);
  if (card.catalogCardId === "AK-011") return selection?.lane ? [] : invalidSelection("Select one lane.");
  if (card.catalogCardId === "AK-019") {
    const creature = selection?.creatureIds?.[0]; const source = creature ? state.cardInstances[creature] : undefined;
    return source?.position && coordinates.length === 1 && emptyNormal(coordinates[0]!) && getLane(source.position.column) === getLane(coordinates[0]!.column) ? [] : invalidSelection("Select a creature and an empty cell in its lane.");
  }
  if (card.catalogCardId === "AK-044") {
    const lane = selection?.lane;
    return lane && coordinates.length === 3 && uniqueCoordinates.size === 3 && coordinates.every((coordinate) => emptyNormal(coordinate) && getLane(coordinate.column) === lane) ? [] : invalidSelection("Select one lane and three empty cells in that lane.");
  }
  if (card.catalogCardId === "AK-054") {
    return ids.length === 2 && new Set(ids).size === 2 && ids.every((id) => { const target = state.cardInstances[id]; return Boolean(target && player.graveyardZone.includes(id) && (target.type === "creature" || target.type === "creature-token")); }) ? [] : invalidSelection("Select two creature cards from your graveyard.");
  }
  if (card.catalogCardId !== "AK-059") return [];
  const valid = ids.length === 2 && new Set(ids).size === 2 && coordinates.length === 2 && uniqueCoordinates.size === 2 &&
    ids.every((id) => {
      const target = state.cardInstances[id];
      return Boolean(target && player.graveyardZone.includes(id) && (target.type === "creature" || target.type === "creature-token") && target.cost <= 5);
    }) && coordinates.every((coordinate) => validateSummonDestination(state, command.side, coordinate).length === 0);
  return valid ? [] : invalidSelection("Resurrection Gate requires two eligible graveyard creatures and two empty summon squares.");
}

function invalidSelection(message: string): readonly BattleValidationIssue[] { return [{ code: "battle.effect.no-target", message, path: "effectSelection" }]; }

function validateMove(
  state: BattleState,
  command: Extract<BattleCommand, { type: "moveCreature" }>
): readonly BattleValidationIssue[] {
  return validateMovementPath(
    state,
    command.side,
    command.creatureInstanceId,
    command.origin,
    command.path
  );
}

function validateWaterBoost(
  state: BattleState,
  command: Extract<BattleCommand, { type: "boostCreatureMovement" }>
): readonly BattleValidationIssue[] {
  const card = state.cardInstances[command.creatureInstanceId];
  if (!card || card.zone !== "board" || card.type === "spell" || card.controllerSide !== command.side || !card.position) {
    return [{ code: "battle.card.zone-invalid", message: "Only your board creature can receive a movement boost.", path: "creatureInstanceId" }];
  }
  const lane = getLane(card.position.column);
  if (!isResonanceActive(state.players[command.side].resonance, lane, "water")) {
    return [{ code: "battle.resonance.inactive", message: "Water resonance is not active in this lane." }];
  }
  return state.players[command.side].resonanceUsage.water[lane]
    ? [{ code: "battle.resonance.already-used", message: "Water resonance was already used in this lane this turn." }]
    : [];
}

function validateHandCard(
  state: BattleState,
  side: "player" | "cpu",
  card: BattleCardInstance | undefined,
  requiredType: "creature" | "spell"
): readonly BattleValidationIssue[] {
  if (!card) {
    return [
      {
        code: "battle.card.not-found",
        message: "The selected card no longer exists.",
        path: "handInstanceId"
      }
    ];
  }

  if (card.ownerSide !== side || !state.players[side].handZone.includes(card.instanceId)) {
    return [
      {
        code: "battle.card.owner-invalid",
        message: "The selected card is not in this side's hand.",
        path: "handInstanceId"
      }
    ];
  }

  if (card.zone !== "hand") {
    return [
      {
        code: "battle.card.zone-invalid",
        message: "The selected card is not in hand.",
        path: "handInstanceId"
      }
    ];
  }

  if (card.type !== requiredType) {
    return [
      {
        code: "battle.card.type-invalid",
        message: requiredType === "creature" ? "Only creature cards can be summoned." : "Only spell cards can be cast.",
        path: "handInstanceId"
      }
    ];
  }

  return [];
}
