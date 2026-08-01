import {
  BATTLE_BOARD_COLUMNS,
  BATTLE_BOARD_ROWS,
  type BattleBoardSquareView,
  type BoardCoordinate
} from "@ankake/domain";
import { useEffect, useRef, useState } from "react";
import { BattleCard } from "./BattleCard";

export interface BattleBoardProps {
  readonly squares: readonly BattleBoardSquareView[];
  readonly candidateKeys?: readonly string[];
  readonly selectedKey?: string;
  readonly onSquareIntent?: (coordinate: BoardCoordinate) => void;
}

export function BattleBoard(props: BattleBoardProps) {
  const firstKey = props.squares[0]?.key ?? "";
  const [focusedKey, setFocusedKey] = useState(firstKey);
  const squareRefs = useRef(new Map<string, HTMLButtonElement>());
  const candidateKeys = new Set(props.candidateKeys ?? []);

  useEffect(() => {
    if (!props.squares.some((square) => square.key === focusedKey)) {
      setFocusedKey(firstKey);
    }
  }, [firstKey, focusedKey, props.squares]);

  return (
    <section className="battle-board-wrap">
      <h2>Board</h2>
      <div
        aria-label="Battle board"
        className="battle-board"
        data-testid="battle-board"
        role="grid"
      >
        {props.squares.map((square) => {
          const isCandidate = candidateKeys.has(square.key);
          const isSelected = props.selectedKey === square.key;

          return (
            <button
              key={square.key}
              aria-label={describeSquare(square, isCandidate, isSelected)}
              aria-selected={isSelected || undefined}
              className={[
                "battle-square",
                `battle-square--${square.terrain}`,
                square.occupant ? "battle-square--occupied" : "",
                isCandidate ? "battle-square--candidate" : "",
                isSelected ? "battle-square--selected" : ""
              ].join(" ")}
              data-testid={`battle-square-${square.coordinate.column}-${square.coordinate.row}`}
              role="gridcell"
              style={{
                gridColumn: square.coordinate.column,
                gridRow: square.coordinate.row
              }}
              tabIndex={focusedKey === square.key ? 0 : -1}
              type="button"
              ref={(element) => {
                if (element) {
                  squareRefs.current.set(square.key, element);
                } else {
                  squareRefs.current.delete(square.key);
                }
              }}
              onClick={() => {
                setFocusedKey(square.key);
                props.onSquareIntent?.(square.coordinate);
              }}
              onFocus={() => setFocusedKey(square.key)}
              onKeyDown={(event) => {
                if (!isArrowKey(event.key)) {
                  return;
                }

                event.preventDefault();
                const next = getNextBoardFocusKey(
                  props.squares,
                  square.key,
                  event.key
                );
                setFocusedKey(next);
                squareRefs.current.get(next)?.focus();
              }}
            >
              {square.occupant ? (
                <BattleCard card={square.occupant} mode="board" />
              ) : null}
              {square.terrain !== "normal" ? (
                <span className="battle-square__base-label">
                  {terrainLabel(square.terrain)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function describeSquare(
  square: BattleBoardSquareView,
  isCandidate: boolean,
  isSelected: boolean
): string {
  const prefix = `Column ${square.coordinate.column}, row ${square.coordinate.row}`;
  const interactionLabel = isSelected
    ? ", selected summon destination"
    : isCandidate
      ? ", available summon destination"
      : "";
  if (square.occupant) {
    return `${prefix}, ${terrainLabel(square.terrain)}, occupied by ${square.occupant.name}${interactionLabel}`;
  }

  return `${prefix}, ${terrainLabel(square.terrain)}${interactionLabel}`;
}

export type BoardFocusDirection =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown";

export function getNextBoardFocusKey(
  squares: readonly BattleBoardSquareView[],
  currentKey: string,
  direction: BoardFocusDirection
): string {
  const current = squares.find((square) => square.key === currentKey);
  if (!current) {
    return squares[0]?.key ?? currentKey;
  }

  const delta = getDirectionDelta(direction);
  const existingKeys = new Set(squares.map((square) => square.key));
  let column = current.coordinate.column + delta.column;
  let row = current.coordinate.row + delta.row;

  while (
    column >= 1 &&
    column <= BATTLE_BOARD_COLUMNS &&
    row >= 1 &&
    row <= BATTLE_BOARD_ROWS
  ) {
    const candidateKey = `${column}:${row}`;
    if (existingKeys.has(candidateKey)) {
      return candidateKey;
    }
    column += delta.column;
    row += delta.row;
  }

  return current.key;
}

function isArrowKey(key: string): key is BoardFocusDirection {
  return (
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowUp" ||
    key === "ArrowDown"
  );
}

function getDirectionDelta(
  direction: BoardFocusDirection
): { readonly column: number; readonly row: number } {
  switch (direction) {
    case "ArrowLeft":
      return { column: -1, row: 0 };
    case "ArrowRight":
      return { column: 1, row: 0 };
    case "ArrowUp":
      return { column: 0, row: -1 };
    case "ArrowDown":
      return { column: 0, row: 1 };
  }
}

function terrainLabel(terrain: BattleBoardSquareView["terrain"]): string {
  switch (terrain) {
    case "cpu-base":
      return "CPU Base";
    case "player-base":
      return "Player Base";
    case "neutral-base":
      return "Neutral Base";
    case "normal":
      return "Normal square";
  }
}
