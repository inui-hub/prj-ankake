import {
  BATTLE_BASE_IDS,
  createInitialBattleBoard,
  createInitialBattleBases,
  getBattleBaseAt,
  getBattleBaseById,
  getOwnedNeutralBases,
  updateBattleBase
} from "@ankake/domain";

describe("battle bases", () => {
  it("creates the five canonical bases in stable order", () => {
    const bases = createInitialBattleBases();

    expect(BATTLE_BASE_IDS.map((id) => bases[id])).toEqual([
      {
        id: "cpu-base",
        coordinate: { column: 6, row: 1 },
        kind: "player-base",
        owner: "cpu",
        currentHp: 20,
        maxHp: 20
      },
      {
        id: "neutral-left",
        coordinate: { column: 2, row: 5 },
        kind: "neutral-base",
        owner: "none",
        currentHp: 10,
        maxHp: 10
      },
      {
        id: "neutral-center",
        coordinate: { column: 6, row: 5 },
        kind: "neutral-base",
        owner: "none",
        currentHp: 20,
        maxHp: 20
      },
      {
        id: "neutral-right",
        coordinate: { column: 10, row: 5 },
        kind: "neutral-base",
        owner: "none",
        currentHp: 10,
        maxHp: 10
      },
      {
        id: "player-base",
        coordinate: { column: 6, row: 9 },
        kind: "player-base",
        owner: "player",
        currentHp: 20,
        maxHp: 20
      }
    ]);
  });

  it("finds bases by stable ID and coordinate", () => {
    const bases = createInitialBattleBases();

    expect(getBattleBaseById(bases, "neutral-center").maxHp).toBe(20);
    expect(getBattleBaseAt(bases, { column: 10, row: 5 })?.id).toBe(
      "neutral-right"
    );
    expect(getBattleBaseAt(bases, { column: 5, row: 5 })).toBeUndefined();
  });

  it("matches the five base coordinates in the canonical board terrain", () => {
    const bases = createInitialBattleBases();
    const board = createInitialBattleBoard();
    const terrainById = {
      "cpu-base": "cpu-base",
      "neutral-left": "neutral-base",
      "neutral-center": "neutral-base",
      "neutral-right": "neutral-base",
      "player-base": "player-base"
    } as const;

    for (const id of BATTLE_BASE_IDS) {
      expect(
        board.squares.find(
          (square) =>
            square.coordinate.column === bases[id].coordinate.column &&
            square.coordinate.row === bases[id].coordinate.row
        )?.terrain
      ).toBe(terrainById[id]);
    }
  });

  it("returns owned neutral bases in canonical order without mutating input", () => {
    const initial = createInitialBattleBases();
    const withLeft = updateBattleBase(initial, "neutral-left", (base) => ({
      ...base,
      owner: "player"
    }));
    const withRight = updateBattleBase(withLeft, "neutral-right", (base) => ({
      ...base,
      owner: "player"
    }));

    expect(getOwnedNeutralBases(withRight, "player").map((base) => base.id)).toEqual([
      "neutral-left",
      "neutral-right"
    ]);
    expect(getOwnedNeutralBases(initial, "player")).toEqual([]);
    expect(initial["neutral-left"].owner).toBe("none");
    expect(withRight).not.toBe(initial);
  });

  it("preserves the map key and entity ID invariant during updates", () => {
    const initial = createInitialBattleBases();
    const updated = updateBattleBase(initial, "neutral-left", (base) => ({
      ...base,
      id: "neutral-right",
      currentHp: 7
    }));

    expect(updated["neutral-left"]).toMatchObject({
      id: "neutral-left",
      currentHp: 7
    });
    expect(updated["neutral-right"]).toBe(initial["neutral-right"]);
  });
});
