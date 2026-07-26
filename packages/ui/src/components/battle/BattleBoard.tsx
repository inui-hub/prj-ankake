import type { BattleBoardSquareView } from "@ankake/domain";
import { useState } from "react";

export interface BattleBoardProps {
  readonly squares: readonly BattleBoardSquareView[];
}

export function BattleBoard(props: BattleBoardProps) {
  const [focusedKey, setFocusedKey] = useState("1:1");

  return (
    <section className="battle-board-wrap">
      <h2>Board</h2>
      <div
        aria-label="Battle board"
        className="battle-board"
        data-testid="battle-board"
        role="grid"
      >
        {props.squares.map((square) => (
          <button
            key={square.key}
            aria-label={describeSquare(square)}
            className={[
              "battle-square",
              `battle-square--${square.terrain}`,
              square.occupant ? "battle-square--occupied" : ""
            ].join(" ")}
            data-testid={`battle-square-${square.coordinate.column}-${square.coordinate.row}`}
            role="gridcell"
            tabIndex={focusedKey === square.key ? 0 : -1}
            type="button"
            onClick={() => setFocusedKey(square.key)}
            onFocus={() => setFocusedKey(square.key)}
            onKeyDown={(event) => {
              const next = getNextKey(square.key, event.key);
              if (!next) {
                return;
              }

              event.preventDefault();
              setFocusedKey(next);
              const [column, row] = next.split(":");
              document
                .querySelector<HTMLButtonElement>(`[data-testid="battle-square-${column}-${row}"]`)
                ?.focus();
            }}
          >
            <span>{square.coordinate.column},{square.coordinate.row}</span>
            {square.occupant ? (
              <strong data-testid={`battle-creature-${square.occupant.instanceId}`}>
                {square.occupant.name}
              </strong>
            ) : (
              <em>{square.terrain}</em>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

function describeSquare(square: BattleBoardSquareView): string {
  const prefix = `Column ${square.coordinate.column}, row ${square.coordinate.row}`;
  if (square.occupant) {
    return `${prefix}, occupied by ${square.occupant.name}`;
  }

  return `${prefix}, ${square.terrain}`;
}

function getNextKey(current: string, key: string): string | undefined {
  const [columnText, rowText] = current.split(":");
  const column = Number(columnText);
  const row = Number(rowText);

  switch (key) {
    case "ArrowLeft":
      return `${Math.max(1, column - 1)}:${row}`;
    case "ArrowRight":
      return `${Math.min(11, column + 1)}:${row}`;
    case "ArrowUp":
      return `${column}:${Math.max(1, row - 1)}`;
    case "ArrowDown":
      return `${column}:${Math.min(9, row + 1)}`;
    default:
      return undefined;
  }
}
