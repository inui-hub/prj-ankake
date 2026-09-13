import { BATTLE_LOG_LIMIT } from "./constants";
import type { BattleCardInstance, BattleEvent, BattleLogEntry, BattleLogSourceCard, BattleLogState, BattleState, BattleTerminalResult } from "./types";

export function eventToLogEntry(event: BattleEvent, state?: BattleState): BattleLogEntry {
  const sourceCard = sourceCardForEvent(event, state);
  return {
    sequence: event.sequence,
    message: event.message,
    type: event.type,
    side: event.side,
    ...(sourceCard ? { sourceCard } : {})
  };
}

export function appendBattleLogEntries(
  log: BattleLogState,
  events: readonly BattleEvent[],
  terminalSummary?: BattleTerminalResult,
  state?: BattleState
): BattleLogState {
  const entries = [...log.entries, ...events.map((event) => eventToLogEntry(event, state))];
  return {
    entries: entries.slice(Math.max(0, entries.length - BATTLE_LOG_LIMIT)),
    terminalSummary: terminalSummary ?? log.terminalSummary
  };
}

function sourceCardForEvent(event: BattleEvent, state: BattleState | undefined): BattleLogSourceCard | undefined {
  const sourceInstanceId = event.data?.effectSourceInstanceId;
  if (typeof sourceInstanceId !== "string") return undefined;
  const card = state?.cardInstances[sourceInstanceId];
  return card ? snapshotCard(card) : undefined;
}

function snapshotCard(card: BattleCardInstance): BattleLogSourceCard {
  return {
    instanceId: card.instanceId,
    catalogCardId: card.catalogCardId,
    name: card.name,
    type: card.type,
    attribute: card.attribute,
    controllerSide: card.controllerSide,
    currentAttack: card.currentAttack ?? card.attack,
    currentHp: card.currentHp,
    maxHp: card.maxHp,
    movement: card.movement,
    effectText: card.effectText
  };
}

export function createEmptyBattleLog(): BattleLogState {
  return {
    entries: []
  };
}
