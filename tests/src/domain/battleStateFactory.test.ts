import {
  BATTLE_BASE_MOVEMENT,
  createBattleState,
  DECK_BATTLE_READY_CARD_COUNT,
  coordinateKey
} from "@ankake/domain";
import { battleSetupInputArbitrary } from "../generators/battleGenerators";
import { battleReadySavedDeckArbitrary } from "../generators/battleGenerators";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";

describe("battle state factory", () => {
  it("creates independent battle snapshots and initial hands", () => {
    const [deck] = fcSample(battleReadySavedDeckArbitrary);
    const result = createBattleState({
      playerDeck: deck,
      cpuDeck: deck,
      firstPlayerMode: "player-first",
      catalog: validCatalogSnapshotFixture,
      seed: "same-deck",
      now: "2026-07-25T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.players.player.deckSnapshot.cards).toHaveLength(DECK_BATTLE_READY_CARD_COUNT);
    expect(result.state.players.cpu.deckSnapshot.cards).toHaveLength(DECK_BATTLE_READY_CARD_COUNT);
    expect(result.state.players.player.handZone).toHaveLength(5);
    expect(result.state.players.cpu.handZone).toHaveLength(5);
    expect(result.state.players.player.deckSnapshot).not.toBe(result.state.players.cpu.deckSnapshot);
    expect(result.state.board.squares).toHaveLength(75);
    expect(new Set(result.state.board.squares.map((square) => coordinateKey(square.coordinate))).size).toBe(75);
    expect(result.state.board.squares.filter((square) => square.terrain !== "normal")).toHaveLength(5);
    expect(
      Object.values(result.state.cardInstances)
        .filter((card) => card.type === "creature")
        .every((card) => card.movement === BATTLE_BASE_MOVEMENT)
    ).toBe(true);
    expect(
      Object.values(result.state.cardInstances)
        .filter((card) => card.type === "spell")
        .every((card) => card.movement === 0)
    ).toBe(true);
  });

  it("is deterministic for identical setup input and seed", () => {
    const [input] = fcSample(battleSetupInputArbitrary);
    const first = createBattleState(input);
    const second = createBattleState(input);

    expect(first).toEqual(second);
  });

  it("rejects non-battle-ready decks", () => {
    const [deck] = fcSample(battleReadySavedDeckArbitrary);
    const result = createBattleState({
      playerDeck: { ...deck, cards: deck.cards.slice(0, 1) },
      cpuDeck: deck,
      firstPlayerMode: "player-first",
      catalog: validCatalogSnapshotFixture,
      seed: "invalid",
      now: "2026-07-25T00:00:00.000Z"
    });

    expect(result.ok).toBe(false);
  });
});

function fcSample<T>(arbitrary: import("fast-check").Arbitrary<T>): [T] {
  const fc = require("fast-check") as typeof import("fast-check");
  return fc.sample(arbitrary, { numRuns: 1 }) as [T];
}
