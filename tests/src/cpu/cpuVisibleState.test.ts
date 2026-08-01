import {
  assertCpuVisibleStateIsRedacted,
  projectCpuVisibleState
} from "@ankake/cpu";
import {
  generateLegalActions,
  projectPublicBattleView
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";
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
});
