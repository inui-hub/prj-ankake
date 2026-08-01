import { BATTLE_BOARD_COLUMNS, BATTLE_BOARD_ROWS } from "./constants";
import type {
  BattleBoard,
  BattleCardInstanceId,
  BattleLane,
  BattleSide,
  BoardCoordinate,
  BoardSquare,
  BoardTerrain
} from "./types";

export const EXISTING_BOARD_COLUMNS_BY_ROW: Readonly<Record<number, readonly number[]>> =
  Object.freeze({
    1: Object.freeze([3, 4, 5, 6, 7, 8, 9]),
    2: Object.freeze([2, 3, 5, 6, 7, 9, 10]),
    3: Object.freeze([1, 2, 5, 6, 7, 10, 11]),
    4: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    5: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    6: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    7: Object.freeze([1, 2, 5, 6, 7, 10, 11]),
    8: Object.freeze([2, 3, 5, 6, 7, 9, 10]),
    9: Object.freeze([3, 4, 5, 6, 7, 8, 9])
  });

const BASE_TERRAIN_BY_COORDINATE: Readonly<Record<string, Exclude<BoardTerrain, "normal">>> =
  Object.freeze({
    "6:1": "cpu-base",
    "2:5": "neutral-base",
    "6:5": "neutral-base",
    "10:5": "neutral-base",
    "6:9": "player-base"
  });

export const CANONICAL_BOARD_COORDINATES: readonly BoardCoordinate[] = Object.freeze(
  Array.from({ length: BATTLE_BOARD_ROWS }, (_, index) => index + 1).flatMap((row) =>
    (EXISTING_BOARD_COLUMNS_BY_ROW[row] ?? []).map((column) =>
      Object.freeze({ column, row })
    )
  )
);

const EXISTING_BOARD_COORDINATE_KEYS = new Set(
  CANONICAL_BOARD_COORDINATES.map(coordinateKey)
);

export const INITIAL_SUMMON_COORDINATES_BY_SIDE: Readonly<
  Record<BattleSide, readonly BoardCoordinate[]>
> = Object.freeze({
  cpu: createInitialSummonCoordinates(1),
  player: createInitialSummonCoordinates(9)
});

const INITIAL_SUMMON_COORDINATE_KEYS_BY_SIDE: Readonly<Record<BattleSide, ReadonlySet<string>>> =
  Object.freeze({
    cpu: new Set(INITIAL_SUMMON_COORDINATES_BY_SIDE.cpu.map(coordinateKey)),
    player: new Set(INITIAL_SUMMON_COORDINATES_BY_SIDE.player.map(coordinateKey))
  });

export function coordinateKey(coordinate: BoardCoordinate): string {
  return `${coordinate.column}:${coordinate.row}`;
}

export function sameCoordinate(left: BoardCoordinate, right: BoardCoordinate): boolean {
  return left.column === right.column && left.row === right.row;
}

export function isInsideBoard(coordinate: BoardCoordinate): boolean {
  return (
    Number.isInteger(coordinate.column) &&
    Number.isInteger(coordinate.row) &&
    coordinate.column >= 1 &&
    coordinate.column <= BATTLE_BOARD_COLUMNS &&
    coordinate.row >= 1 &&
    coordinate.row <= BATTLE_BOARD_ROWS
  );
}

export function isExistingBoardCoordinate(coordinate: BoardCoordinate): boolean {
  return isInsideBoard(coordinate) && EXISTING_BOARD_COORDINATE_KEYS.has(coordinateKey(coordinate));
}

export function getLane(column: number): BattleLane {
  if (column <= 4) {
    return "left";
  }

  if (column >= 8) {
    return "right";
  }

  return "center";
}

export function getTerrain(coordinate: BoardCoordinate): BoardTerrain | undefined {
  if (!isExistingBoardCoordinate(coordinate)) {
    return undefined;
  }

  return BASE_TERRAIN_BY_COORDINATE[coordinateKey(coordinate)] ?? "normal";
}

export function isNormalBoardCoordinate(coordinate: BoardCoordinate): boolean {
  return getTerrain(coordinate) === "normal";
}

export function createInitialBattleBoard(): BattleBoard {
  return {
    squares: CANONICAL_BOARD_COORDINATES.map((coordinate): BoardSquare => ({
      coordinate,
      lane: getLane(coordinate.column),
      terrain: getTerrain(coordinate) as BoardTerrain
    }))
  };
}

export function getBoardSquare(
  board: BattleBoard,
  coordinate: BoardCoordinate
): BoardSquare | undefined {
  return board.squares.find((square) => sameCoordinate(square.coordinate, coordinate));
}

export function getOccupantId(
  board: BattleBoard,
  coordinate: BoardCoordinate
): BattleCardInstanceId | undefined {
  return getBoardSquare(board, coordinate)?.occupantId;
}

export function setBoardOccupant(
  board: BattleBoard,
  coordinate: BoardCoordinate,
  occupantId: BattleCardInstanceId | undefined
): BattleBoard {
  return {
    squares: board.squares.map((square) =>
      sameCoordinate(square.coordinate, coordinate)
        ? {
            ...square,
            occupantId
          }
        : square
    )
  };
}

export function isAdjacentStep(from: BoardCoordinate, to: BoardCoordinate): boolean {
  const columnDelta = Math.abs(from.column - to.column);
  const rowDelta = Math.abs(from.row - to.row);
  return columnDelta <= 1 && rowDelta <= 1 && columnDelta + rowDelta > 0;
}

export function getAdjacentBoardCoordinates(
  coordinate: BoardCoordinate
): readonly BoardCoordinate[] {
  return CANONICAL_BOARD_COORDINATES.filter((candidate) =>
    isAdjacentStep(coordinate, candidate)
  );
}

export function isInitialSummonCoordinate(
  side: BattleSide,
  coordinate: BoardCoordinate
): boolean {
  return INITIAL_SUMMON_COORDINATE_KEYS_BY_SIDE[side].has(coordinateKey(coordinate));
}

function createInitialSummonCoordinates(row: number): readonly BoardCoordinate[] {
  return Object.freeze(
    [3, 4, 5, 7, 8, 9].map((column) => Object.freeze({ column, row }))
  );
}
