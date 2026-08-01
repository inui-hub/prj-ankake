import {
  CANONICAL_BOARD_COORDINATES,
  GameEngine,
  INITIAL_SUMMON_COORDINATES_BY_SIDE,
  coordinateKey,
  createInitialBattleBoard,
  getLane,
  getTerrain,
  isExistingBoardCoordinate,
  isNormalBoardCoordinate,
  placeCreatureForTest,
  validateBattleCommand,
  type BattleCardInstance,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

const EXPECTED_COORDINATE_KEYS = [
  "3:1", "4:1", "5:1", "6:1", "7:1", "8:1", "9:1",
  "2:2", "3:2", "5:2", "6:2", "7:2", "9:2", "10:2",
  "1:3", "2:3", "5:3", "6:3", "7:3", "10:3", "11:3",
  "1:4", "2:4", "3:4", "4:4", "5:4", "6:4", "7:4", "8:4", "9:4", "10:4", "11:4",
  "1:5", "2:5", "3:5", "4:5", "5:5", "6:5", "7:5", "8:5", "9:5", "10:5", "11:5",
  "1:6", "2:6", "3:6", "4:6", "5:6", "6:6", "7:6", "8:6", "9:6", "10:6", "11:6",
  "1:7", "2:7", "5:7", "6:7", "7:7", "10:7", "11:7",
  "2:8", "3:8", "5:8", "6:8", "7:8", "9:8", "10:8",
  "3:9", "4:9", "5:9", "6:9", "7:9", "8:9", "9:9"
] as const;

describe("battle board topology", () => {
  it("creates the exact 75 specification coordinates in row-major order", () => {
    const board = createInitialBattleBoard();

    expect(board.squares.map((square) => coordinateKey(square.coordinate))).toEqual(
      EXPECTED_COORDINATE_KEYS
    );
    expect(CANONICAL_BOARD_COORDINATES.map(coordinateKey)).toEqual(
      EXPECTED_COORDINATE_KEYS
    );
  });

  it("classifies exactly five bases, seventy normal cells, and the three lanes", () => {
    const board = createInitialBattleBoard();
    const terrainCounts = countBy(board.squares.map((square) => square.terrain));
    const laneCounts = countBy(board.squares.map((square) => square.lane));

    expect(terrainCounts).toEqual({
      "cpu-base": 1,
      "neutral-base": 3,
      normal: 70,
      "player-base": 1
    });
    expect(laneCounts).toEqual({ center: 27, left: 24, right: 24 });
    expect(getTerrain({ column: 6, row: 1 })).toBe("cpu-base");
    expect(getTerrain({ column: 2, row: 5 })).toBe("neutral-base");
    expect(getTerrain({ column: 6, row: 5 })).toBe("neutral-base");
    expect(getTerrain({ column: 10, row: 5 })).toBe("neutral-base");
    expect(getTerrain({ column: 6, row: 9 })).toBe("player-base");
    expect(getLane(1)).toBe("left");
    expect(getLane(6)).toBe("center");
    expect(getLane(11)).toBe("right");
  });

  it("does not turn an in-envelope absent coordinate into terrain", () => {
    expect(isExistingBoardCoordinate({ column: 1, row: 1 })).toBe(false);
    expect(isNormalBoardCoordinate({ column: 1, row: 1 })).toBe(false);
    expect(getTerrain({ column: 1, row: 1 })).toBeUndefined();
  });

  it("defines exactly six normal initial summon squares per side", () => {
    expect(INITIAL_SUMMON_COORDINATES_BY_SIDE.player.map(coordinateKey)).toEqual([
      "3:9", "4:9", "5:9", "7:9", "8:9", "9:9"
    ]);
    expect(INITIAL_SUMMON_COORDINATES_BY_SIDE.cpu.map(coordinateKey)).toEqual([
      "3:1", "4:1", "5:1", "7:1", "8:1", "9:1"
    ]);
    expect(
      Object.values(INITIAL_SUMMON_COORDINATES_BY_SIDE)
        .flat()
        .every(isNormalBoardCoordinate)
    ).toBe(true);
  });

  it("rejects absent and base summon or movement destinations", () => {
    const state = createPlayerCreatureState();
    const creatureId = state.players.player.handZone[0] as string;
    const absentSummon = validateBattleCommand(state, {
      type: "summonCreature",
      side: "player",
      handInstanceId: creatureId,
      destination: { column: 4, row: 8 }
    });
    const baseSummon = validateBattleCommand(state, {
      type: "summonCreature",
      side: "player",
      handInstanceId: creatureId,
      destination: { column: 6, row: 9 }
    });
    const onBoard = placeCreatureForTest(state, creatureId, "player", 5, 8);
    const baseMove = GameEngine.submitCommand(onBoard, {
      type: "moveCreature",
      side: "player",
      creatureInstanceId: creatureId,
      origin: { column: 5, row: 8 },
      path: [{ column: 6, row: 9 }]
    });

    expect(absentSummon[0]?.code).toBe("battle.board.coordinate-invalid");
    expect(baseSummon[0]?.code).toBe("battle.board.destination-invalid");
    expect(baseMove.ok).toBe(false);
    if (!baseMove.ok) {
      expect(baseMove.issues[0]?.code).toBe("battle.board.destination-invalid");
    }
  });
});

function createPlayerCreatureState(): BattleState {
  const sampled = fc.sample(battleStateArbitrary, { numRuns: 1, seed: 1001 })[0];
  const creature = Object.values(sampled.cardInstances).find(
    (card) => card.ownerSide === "player" && card.type === "creature"
  ) as BattleCardInstance | undefined;

  if (!creature) {
    throw new Error("Expected the fixture to include a player creature.");
  }

  return {
    ...sampled,
    phase: "play",
    activeSide: "player",
    players: {
      ...sampled.players,
      player: {
        ...sampled.players.player,
        currentPp: 10,
        maxPp: 10,
        handZone: [creature.instanceId]
      }
    },
    cardInstances: {
      ...sampled.cardInstances,
      [creature.instanceId]: {
        ...creature,
        zone: "hand",
        position: undefined,
        summonedThisTurn: false,
        movedThisTurn: false
      }
    }
  };
}

function countBy(values: readonly string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
