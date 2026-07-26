import { BATTLE_LOG_LIMIT } from "./constants";
import type { BattleEvent, BattleLogEntry, BattleLogState, BattleTerminalResult } from "./types";

export function eventToLogEntry(event: BattleEvent): BattleLogEntry {
  return {
    sequence: event.sequence,
    message: event.message,
    type: event.type,
    side: event.side
  };
}

export function appendBattleLogEntries(
  log: BattleLogState,
  events: readonly BattleEvent[],
  terminalSummary?: BattleTerminalResult
): BattleLogState {
  const entries = [...log.entries, ...events.map(eventToLogEntry)];
  return {
    entries: entries.slice(Math.max(0, entries.length - BATTLE_LOG_LIMIT)),
    terminalSummary: terminalSummary ?? log.terminalSummary
  };
}

export function createEmptyBattleLog(): BattleLogState {
  return {
    entries: []
  };
}
