import {
  generateLegalActions
} from "@ankake/domain";
import {
  attemptRuntimeCommand,
  createBattleRuntimeSession,
  executeCpuTurn,
  submitRuntimeCommand
} from "../../../apps/web/src/battle/battleRuntimeService";
import {
  getBattleStartDisabledReason,
  loadBattlePreparation,
  startBattle
} from "../../../apps/web/src/battle/battleSetupService";
import { createConsoleBattleDiagnostics } from "../../../apps/web/src/battle/battleDiagnostics";
import { InMemoryDeckRepository } from "../fakes/inMemoryDeckRepository";
import { battleReadySavedDeckArbitrary } from "../generators/battleGenerators";
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

  it("executes CPU turns with a bounded command limit", async () => {
    const session = await createStartedSession("player-second");
    const result = await executeCpuTurn(session, createConsoleBattleDiagnostics(), async () => {}, 1);

    expect(result.acceptedCommands).toBeLessThanOrEqual(1);
    expect(["processing-limit", "no-beneficial-action", "terminal"]).toContain(result.stopReason);
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
