import type { BattleEvent, BattleValidationIssue } from "@ankake/domain";
import type { CpuStopReason } from "@ankake/cpu";

export interface BattleDiagnosticSink {
  validationIssues(issues: readonly BattleValidationIssue[]): void;
  events(events: readonly BattleEvent[]): void;
  cpuStop(reason: CpuStopReason): void;
  seed(seed: string): void;
}

export function createConsoleBattleDiagnostics(): BattleDiagnosticSink {
  return {
    validationIssues: (issues) => {
      if (issues.length > 0) {
        console.info("[ankake:battle:validation]", issues.map((issue) => issue.code));
      }
    },
    events: (events) => {
      if (events.length > 0) {
        console.info("[ankake:battle:events]", {
          first: events[0]?.sequence,
          last: events.at(-1)?.sequence,
          count: events.length
        });
      }
    },
    cpuStop: (reason) => {
      console.info("[ankake:battle:cpu-stop]", reason);
    },
    seed: (seed) => {
      console.info("[ankake:battle:seed]", seed);
    }
  };
}
