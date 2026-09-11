import {
  generateLegalActions,
  getShortestMovementPaths
} from "@ankake/domain";
import {
  attemptRuntimeCommand,
  createBattleRuntimeSession,
  executeCpuTurn,
  submitRuntimeCommand
} from "../../../apps/web/src/battle/battleRuntimeService";
import { getCpuStatusAfterExecution } from "../../../apps/web/src/battle/useBattleController";
import {
  getBattleStartDisabledReason,
  loadBattlePreparation,
  startBattle
} from "../../../apps/web/src/battle/battleSetupService";
import { createConsoleBattleDiagnostics } from "../../../apps/web/src/battle/battleDiagnostics";
import { InMemoryDeckRepository } from "../fakes/inMemoryDeckRepository";
import {
  battleReadySavedDeckArbitrary,
  movableCreatureStateArbitrary
} from "../generators/battleGenerators";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";
import fc from "fast-check";

describe("battle runtime service", () => {
  it("loads battle-ready deck defaults for preparation", async () => {
    const deck = fc.sample(battleReadySavedDeckArbitrary, { numRuns: 1 })[0];
    const repository = new InMemoryDeckRepository({
      catalog: validCatalogSnapshotFixture,
      initialDecks: [deck]
    });

    const preparation = await loadBattlePreparation(repository);

    expect(preparation.playerDeckId).toBe(deck.deckId);
    expect(preparation.cpuDeckId).toBe(deck.deckId);
    expect(getBattleStartDisabledReason(preparation)).toBeUndefined();
  });

  it("starts a battle and records initial logs", async () => {
    const deck = fc.sample(battleReadySavedDeckArbitrary, { numRuns: 1 })[0];
    const repository = new InMemoryDeckRepository({
      catalog: validCatalogSnapshotFixture,
      initialDecks: [deck]
    });

    const result = await startBattle({
      repository,
      catalog: validCatalogSnapshotFixture,
      playerDeckId: deck.deckId,
      cpuDeckId: deck.deckId,
      firstPlayerMode: "player-first"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const session = createBattleRuntimeSession(result.state, result.events);
    expect(session.log.entries.length).toBeGreaterThan(0);
  });

  it("keeps state unchanged for rejected runtime commands", async () => {
    const session = await createStartedSession("player-first");
    const diagnostics = createConsoleBattleDiagnostics();
    const next = submitRuntimeCommand(
      session,
      {
        type: "summonCreature",
        side: "player",
        handInstanceId: "missing",
        destination: { column: 99, row: 99 }
      },
      diagnostics
    );

    expect(next).toBe(session);
  });

  it("returns a new confirmed session for an accepted command attempt", async () => {
    const session = await createStartedSession("player-first");
    const result = attemptRuntimeCommand(
      session,
      {
        type: "endPlayPhase",
        side: "player",
        reason: "manual"
      },
      createConsoleBattleDiagnostics()
    );

    expect(result.ok).toBe(true);
    expect(result.session).not.toBe(session);
    expect(result.session.state).not.toBe(session.state);
    expect(result.session.log.entries.length).toBeGreaterThan(session.log.entries.length);
    expect(result.session.lastEvents.length).toBeGreaterThan(0);
  });

  it("returns the original session and validation issues for a rejected attempt", async () => {
    const session = await createStartedSession("player-first");
    const result = attemptRuntimeCommand(
      session,
      {
        type: "summonCreature",
        side: "player",
        handInstanceId: "missing",
        destination: { column: 99, row: 99 }
      },
      createConsoleBattleDiagnostics()
    );

    expect(result.ok).toBe(false);
    expect(result.session).toBe(session);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.code)).toEqual([
        "battle.card.not-found"
      ]);
    }
  });

  it("submits a complete movement command through the shared runtime path", () => {
    const fixture = fc.sample(
      movableCreatureStateArbitrary.filter((candidate) => {
        return (
          candidate.side === "player" &&
          getShortestMovementPaths(
            candidate.state,
            candidate.side,
            candidate.creatureInstanceId
          ).length > 0
        );
      }),
      { numRuns: 1, seed: 7314 }
    )[0]!;
    const path = getShortestMovementPaths(
      fixture.state,
      fixture.side,
      fixture.creatureInstanceId
    )[0]!;
    const session = createBattleRuntimeSession(fixture.state, []);
    const result = attemptRuntimeCommand(
      session,
      {
        type: "moveCreature",
        side: "player",
        creatureInstanceId: fixture.creatureInstanceId,
        origin: fixture.origin,
        path
      },
      createConsoleBattleDiagnostics()
    );

    expect(result.ok).toBe(true);
    expect(result.session).not.toBe(session);
    expect(session.state.cardInstances[fixture.creatureInstanceId]?.position).toEqual(
      fixture.origin
    );
    expect(result.session.log.entries.at(-1)?.type).toBe("creature.moved");
  });

  it("executes CPU turns with a bounded command limit", async () => {
    const session = await createStartedSession("player-second");
    const result = await executeCpuTurn(session, createConsoleBattleDiagnostics(), async () => {}, 1);

    expect(result.acceptedCommands).toBeLessThanOrEqual(1);
    expect(["processing-limit", "no-beneficial-action", "terminal"]).toContain(result.stopReason);
  });

  it("continues to the player turn when the CPU reaches a nonterminal processing limit", async () => {
    const session = await createStartedSession("player-second");
    const result = await executeCpuTurn(session, createConsoleBattleDiagnostics(), async () => {}, 0);

    expect(result.stopReason).toBe("processing-limit");
    expect(result.acceptedCommands).toBe(0);
    expect(result.session.state.terminalResult).toBeUndefined();
    expect(result.session.state.phase).toBe("play");
    expect(result.session.state.activeSide).toBe("player");
    expect(getCpuStatusAfterExecution(result.stopReason, false)).toBe("limit-reached");
    expect(getCpuStatusAfterExecution(result.stopReason, true)).toBe("completed");
  });

  it("continues beyond eight turns without a fixed-turn terminal result", async () => {
    let session = await createStartedSession("player-first");
    const diagnostics = createConsoleBattleDiagnostics();

    for (let turn = 0; turn < 8; turn += 1) {
      session = submitRuntimeCommand(
        session,
        { type: "endPlayPhase", side: "player", reason: "manual" },
        diagnostics
      );
      const cpuResult = await executeCpuTurn(session, diagnostics, async () => {}, 0);
      session = cpuResult.session;

      expect(cpuResult.stopReason).toBe("processing-limit");
      expect(session.state.terminalResult).toBeUndefined();
      expect(session.state.phase).toBe("play");
      expect(session.state.activeSide).toBe("player");
    }

    expect(session.state.metadata.turnNumber).toBeGreaterThan(8);
  });

  it("exposes legal actions for the active runtime state", async () => {
    const session = await createStartedSession("player-first");
    expect(generateLegalActions(session.state, session.state.activeSide).length).toBeGreaterThan(0);
  });
});

async function createStartedSession(firstPlayerMode: "player-first" | "player-second") {
  const deck = fc.sample(battleReadySavedDeckArbitrary, { numRuns: 1 })[0];
  const repository = new InMemoryDeckRepository({
    catalog: validCatalogSnapshotFixture,
    initialDecks: [deck]
  });
  const result = await startBattle({
    repository,
    catalog: validCatalogSnapshotFixture,
    playerDeckId: deck.deckId,
    cpuDeckId: deck.deckId,
    firstPlayerMode
  });

  if (!result.ok) {
    throw new Error("Failed to create battle session in test.");
  }

  return createBattleRuntimeSession(result.state, result.events);
}
