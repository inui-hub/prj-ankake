import {
  chooseCpuAction,
  projectCpuVisibleState,
  type CpuVisibleState
} from "@ankake/cpu";
import {
  generateLegalActions,
  isNormalBoardCoordinate
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";
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

  it("receives only canonical normal summon and movement destinations", () => {
    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        const cpuState = {
          ...state,
          phase: "play" as const,
          activeSide: "cpu" as const,
          terminalResult: undefined
        };
        const legalActions = generateLegalActions(cpuState, "cpu");
        const visible = projectCpuVisibleState(cpuState, legalActions);

        for (const action of visible.legalActions) {
          if (action.command.type === "summonCreature") {
            expect(isNormalBoardCoordinate(action.command.destination)).toBe(true);
          }

          if (action.command.type === "moveCreature") {
            expect(action.command.path.every(isNormalBoardCoordinate)).toBe(true);
          }
        }

        const decision = chooseCpuAction(visible);
        if (decision.kind === "command" && decision.command.type === "summonCreature") {
          expect(isNormalBoardCoordinate(decision.command.destination)).toBe(true);
        }
        if (decision.kind === "command" && decision.command.type === "moveCreature") {
          expect(decision.command.path.every(isNormalBoardCoordinate)).toBe(true);
        }
      }),
      { numRuns: 40 }
    );
  });
});
