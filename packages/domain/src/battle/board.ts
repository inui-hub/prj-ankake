import { BATTLE_BOARD_COLUMNS, BATTLE_BOARD_ROWS } from "./constants";
import type {
  BattleBoard,
  BattleCardInstanceId,
  BattleLane,
  BoardCoordinate,
  BoardSquare,
  BoardTerrain
} from "./types";

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

export function getLane(column: number): BattleLane {
  if (column <= 4) {
    return "left";
  }

  if (column >= 8) {
    return "right";
  }

  return "center";
}

export function getTerrain(coordinate: BoardCoordinate): BoardTerrain {
  if (coordinate.row === 1 && coordinate.column === 6) {
    return "cpu-base";
  }

  if (coordinate.row === BATTLE_BOARD_ROWS && coordinate.column === 6) {
    return "player-base";
  }

  if (coordinate.column === 6 && coordinate.row === 5) {
    return "neutral-base";
  }

  return "normal";
}

export function createInitialBattleBoard(): BattleBoard {
  const squares: BoardSquare[] = [];

  for (let row = 1; row <= BATTLE_BOARD_ROWS; row += 1) {
    for (let column = 1; column <= BATTLE_BOARD_COLUMNS; column += 1) {
      const coordinate = { column, row };
      squares.push({
        coordinate,
        lane: getLane(column),
        terrain: getTerrain(coordinate)
      });
    }
  }

  return { squares };
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

export function isSummonRow(side: "player" | "cpu", coordinate: BoardCoordinate): boolean {
  if (side === "player") {
    return coordinate.row >= 6 && coordinate.row <= 8;
  }

  return coordinate.row >= 2 && coordinate.row <= 4;
}
