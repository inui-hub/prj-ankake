import {
  appendBattleLogEntries,
  createEmptyBattleLog,
  generateLegalActions,
  GameEngine,
  type BattleCommand,
  type BattleEvent,
  type BattleLogState,
  type BattleState,
  type BattleValidationIssue
} from "@ankake/domain";
import {
  chooseCpuAction,
  projectCpuVisibleState,
  type CpuStopReason
} from "@ankake/cpu";
import type { BattleDiagnosticSink } from "./battleDiagnostics";
import type { SchedulerYield } from "./scheduler";

export interface BattleRuntimeSession {
  readonly state: BattleState;
  readonly log: BattleLogState;
  readonly lastEvents: readonly BattleEvent[];
}

export interface CpuTurnExecutionResult {
  readonly session: BattleRuntimeSession;
  readonly acceptedCommands: number;
  readonly stopReason: CpuStopReason;
}

export type BattleRuntimeSubmission =
  | {
      readonly ok: true;
      readonly session: BattleRuntimeSession;
    }
  | {
      readonly ok: false;
      readonly session: BattleRuntimeSession;
      readonly issues: readonly BattleValidationIssue[];
    };

export function createBattleRuntimeSession(
  state: BattleState,
  events: readonly BattleEvent[]
): BattleRuntimeSession {
  return {
    state,
    log: appendBattleLogEntries(createEmptyBattleLog(), events, state.terminalResult),
    lastEvents: events
  };
}

export function submitRuntimeCommand(
  session: BattleRuntimeSession,
  command: BattleCommand,
  diagnostics: BattleDiagnosticSink
): BattleRuntimeSession {
  return attemptRuntimeCommand(session, command, diagnostics).session;
}

export function attemptRuntimeCommand(
  session: BattleRuntimeSession,
  command: BattleCommand,
  diagnostics: BattleDiagnosticSink
): BattleRuntimeSubmission {
  const result = GameEngine.submitCommand(session.state, command);

  if (!result.ok) {
    diagnostics.validationIssues(result.issues);
    return {
      ok: false,
      session,
      issues: result.issues
    };
  }

  diagnostics.events(result.events);
  return {
    ok: true,
    session: {
      state: result.state,
      log: appendBattleLogEntries(session.log, result.events, result.state.terminalResult),
      lastEvents: result.events
    }
  };
}

export async function executeCpuTurn(
  initialSession: BattleRuntimeSession,
  diagnostics: BattleDiagnosticSink,
  yieldControl: SchedulerYield,
  acceptedCommandLimit = 30
): Promise<CpuTurnExecutionResult> {
  let session = initialSession;
  let acceptedCommands = 0;

  while (
    session.state.phase === "play" &&
    session.state.activeSide === "cpu" &&
    !session.state.terminalResult
  ) {
    if (acceptedCommands >= acceptedCommandLimit) {
      diagnostics.cpuStop("processing-limit");
      const forcedEnd = submitRuntimeCommand(
        session,
        {
          type: "endPlayPhase",
          side: "cpu",
          reason: "cpu"
        },
        diagnostics
      );
      return {
        session: forcedEnd,
        acceptedCommands,
        stopReason: "processing-limit"
      };
    }

    const legalActions = generateLegalActions(session.state, "cpu");
    const visible = projectCpuVisibleState(session.state, legalActions);
    const decision = chooseCpuAction(visible);

    if (decision.kind === "stop") {
      diagnostics.cpuStop(decision.reason);
      const ended =
        decision.reason === "terminal"
          ? session
          : submitRuntimeCommand(
              session,
              {
                type: "endPlayPhase",
                side: "cpu",
                reason: "cpu"
              },
              diagnostics
            );
      return {
        session: ended,
        acceptedCommands,
        stopReason: decision.reason
      };
    }

    session = submitRuntimeCommand(session, decision.command, diagnostics);
    acceptedCommands += 1;
    await yieldControl();
  }

  return {
    session,
    acceptedCommands,
    stopReason: session.state.terminalResult ? "terminal" : "no-beneficial-action"
  };
}
