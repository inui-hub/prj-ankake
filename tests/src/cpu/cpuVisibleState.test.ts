import {
  assertCpuVisibleStateIsRedacted,
  projectCpuVisibleState
} from "@ankake/cpu";
import {
  generateLegalActions,
  projectPublicBattleView
} from "@ankake/domain";
import fc from "fast-check";
import {
  battleStateArbitrary,
  eligibleHandCreatureStateArbitrary,
  movableCreatureStateArbitrary
} from "../generators/battleGenerators";
import { cpuVisibleStateArbitrary } from "../generators/cpuGenerators";

describe("CPU visible state", () => {
  it("contains counts for player hidden zones rather than player hand identities", () => {
    fc.assert(
      fc.property(cpuVisibleStateArbitrary, (visible) => {
        expect(assertCpuVisibleStateIsRedacted(visible)).toBe(true);
        expect(Array.isArray((visible as unknown as { playerHand?: unknown }).playerHand)).toBe(false);
      }),
      { numRuns: 40 }
    );
  });

  it("projects CPU legal actions without exposing full battle state containers", () => {
    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        const visible = projectCpuVisibleState(state, generateLegalActions(state, "cpu"));

        expect("cardInstances" in visible).toBe(false);
        expect("deckZone" in visible).toBe(false);
        expect(visible.playerHandCount).toBe(state.players.player.handZone.length);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps player hand identities out of the CPU view after player projection expands", () => {
    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        const publicView = projectPublicBattleView(state);
        const cpuView = projectCpuVisibleState(
          state,
          generateLegalActions(state, "cpu")
        );
        const serializedCpuView = JSON.stringify(cpuView);

        expect(publicView.playerHand.map((card) => card.instanceId)).toEqual(
          state.players.player.handZone
        );
        for (const playerHandInstanceId of state.players.player.handZone) {
          expect(serializedCpuView).not.toContain(playerHandInstanceId);
        }
      }),
      { numRuns: 40 }
    );
  });

  it("does not project player actionability or web-owned pending interaction", () => {
    fc.assert(
      fc.property(
        eligibleHandCreatureStateArbitrary.filter((fixture) => fixture.side === "player"),
        (fixture) => {
          const stateWithWebInteraction = {
            ...fixture.state,
            pendingInteraction: {
              type: "selecting-summon",
              handInstanceId: fixture.handInstanceId,
              candidateDestinations: [{ column: 3, row: 9 }]
            }
          };
          const publicView = projectPublicBattleView(fixture.state);
          const cpuView = projectCpuVisibleState(
            stateWithWebInteraction,
            generateLegalActions(fixture.state, "cpu")
          );
          const serialized = JSON.stringify(cpuView);

          expect(publicView.playerHand[0]?.isActionable).toBe(true);
          expect(serialized).not.toContain(fixture.handInstanceId);
          expect(serialized).not.toContain("pendingInteraction");
          expect(serialized).not.toContain("candidateDestinations");
          expect("playerHand" in cpuView).toBe(false);
        }
      ),
      { numRuns: 40 }
    );
  });

  it("projects public movement actionability without leaking a web-owned path draft", () => {
    fc.assert(
      fc.property(
        movableCreatureStateArbitrary.filter((fixture) => fixture.side === "player"),
        (fixture) => {
          const stateWithWebDraft = {
            ...fixture.state,
            pendingInteraction: {
              type: "selecting-move",
              creatureInstanceId: fixture.creatureInstanceId,
              expectedOrigin: fixture.origin,
              path: [{ column: fixture.origin.column + 1, row: fixture.origin.row }]
            }
          };
          const publicOccupant = projectPublicBattleView(fixture.state).boardSquares.find(
            (square) => square.occupant?.instanceId === fixture.creatureInstanceId
          )?.occupant;
          const cpuView = projectCpuVisibleState(
            stateWithWebDraft,
            generateLegalActions(fixture.state, "cpu")
          );
          const serialized = JSON.stringify(cpuView);

          expect(publicOccupant?.isActionable).toBe(
            generateLegalActions(fixture.state, "player").some(
              (action) => action.command.type === "moveCreature"
            )
          );
          expect(serialized).not.toContain("pendingInteraction");
          expect(serialized).not.toContain("expectedOrigin");
          expect(serialized).not.toContain('"path"');
          for (const playerHandInstanceId of fixture.state.players.player.handZone) {
            expect(serialized).not.toContain(playerHandInstanceId);
          }
        }
      ),
      { numRuns: 60, seed: 7312 }
    );
  });
});
