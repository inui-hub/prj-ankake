import {
  GameEngine,
  generateLegalActions,
  type BattleCommand
} from "@ankake/domain";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("battle engine", () => {
  it("rejects invalid commands without mutating state", () => {
    const state = sampleBattleState();
    const invalid: BattleCommand = {
      type: "summonCreature",
      side: state.activeSide,
      handInstanceId: "missing",
      destination: { column: 99, row: 99 }
    };
    const result = GameEngine.submitCommand(state, invalid);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
  });

  it("accepts generated legal actions through the same reducer path", () => {
    const state = sampleBattleState();
    const action = generateLegalActions(state, state.activeSide)[0];

    expect(action).toBeDefined();
    if (!action) {
      return;
    }

    const result = GameEngine.submitCommand(state, action.command);

    expect(result.ok).toBe(true);
  });

  it("advances to the opposing side after end play phase", () => {
    const state = sampleBattleState();
    const result = GameEngine.submitCommand(state, {
      type: "endPlayPhase",
      side: state.activeSide,
      reason: "manual"
    });

    expect(result.ok).toBe(true);
    if (result.ok && !result.state.terminalResult) {
      expect(result.state.activeSide).not.toBe(state.activeSide);
      expect(result.events.some((event) => event.type === "standby.resolved")).toBe(true);
    }
  });
});

function sampleBattleState() {
  const fc = require("fast-check") as typeof import("fast-check");
  return fc.sample(battleStateArbitrary, { numRuns: 1 })[0];
}
