import {
  chooseCpuAction,
  type CpuVisibleState
} from "@ankake/cpu";
import fc from "fast-check";
import { cpuVisibleStateArbitrary } from "../generators/cpuGenerators";

describe("CPU strategy", () => {
  it("returns a stop reason when no legal actions exist", () => {
    const visible: CpuVisibleState = {
      activeSide: "cpu",
      phase: "play",
      turnNumber: 1,
      cpuHand: [],
      cpuHandCount: 0,
      playerHandCount: 5,
      cpuDeckCount: 35,
      playerDeckCount: 35,
      cpuBaseHp: 20,
      playerBaseHp: 20,
      boardCards: [],
      legalActions: []
    };

    expect(chooseCpuAction(visible)).toEqual({
      kind: "stop",
      reason: "no-legal-action"
    });
  });

  it("chooses deterministic commands or explicit stop reasons", () => {
    fc.assert(
      fc.property(cpuVisibleStateArbitrary, (visible) => {
        const first = chooseCpuAction(visible);
        const second = chooseCpuAction(visible);

        expect(first).toEqual(second);
        if (first.kind === "command") {
          expect(visible.legalActions.some((action) => action.command === first.command)).toBe(true);
        } else {
          expect(["no-legal-action", "no-beneficial-action", "terminal"]).toContain(first.reason);
        }
      }),
      { numRuns: 40 }
    );
  });
});
