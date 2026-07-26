import {
  GameEngine,
  RESONANCE_MAX,
  generateLegalActions
} from "@ankake/domain";
import fc from "fast-check";
import {
  battleStateArbitrary,
  legalBattleCommandArbitrary
} from "../generators/battleGenerators";

describe("battle domain properties", () => {
  it("accepts every generated legal action for the same state", () => {
    fc.assert(
      fc.property(legalBattleCommandArbitrary, ({ state, command }) => {
        const result = GameEngine.submitCommand(state, command);
        expect(result.ok).toBe(true);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps board occupancy unique after accepted generated commands", () => {
    fc.assert(
      fc.property(legalBattleCommandArbitrary, ({ state, command }) => {
        const result = GameEngine.submitCommand(state, command);
        if (!result.ok) {
          return;
        }

        const occupants = result.state.board.squares
          .map((square) => square.occupantId)
          .filter((id): id is string => Boolean(id));
        expect(new Set(occupants).size).toBe(occupants.length);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps resource, hand, and resonance values in range", () => {
    fc.assert(
      fc.property(legalBattleCommandArbitrary, ({ state, command }) => {
        const result = GameEngine.submitCommand(state, command);
        if (!result.ok) {
          return;
        }

        for (const player of Object.values(result.state.players)) {
          expect(player.currentPp).toBeGreaterThanOrEqual(0);
          expect(player.currentPp).toBeLessThanOrEqual(player.maxPp);
          expect(player.handZone.length).toBeLessThanOrEqual(9);

          for (const lane of Object.values(player.resonance)) {
            for (const value of Object.values(lane)) {
              expect(value).toBeGreaterThanOrEqual(0);
              expect(value).toBeLessThanOrEqual(RESONANCE_MAX);
            }
          }
        }
      }),
      { numRuns: 40 }
    );
  });

  it("does not produce legal actions when the battle is not active for that side", () => {
    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        const inactiveSide = state.activeSide === "player" ? "cpu" : "player";
        expect(generateLegalActions(state, inactiveSide)).toEqual([]);
      }),
      { numRuns: 30 }
    );
  });
});
