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
  readonly selectedCreatureInstanceId?: string;
  readonly movementOriginKey?: string;
  readonly movementPathSteps?: readonly {
    readonly key: string;
    readonly stepNumber: number;
  }[];
  readonly provisionalPositionKey?: string;
  readonly interactionDisabled?: boolean;
  readonly onCreatureIntent?: (instanceId: string) => void;
  readonly onSquareIntent?: (coordinate: BoardCoordinate) => void;
}

export function BattleBoard(props: BattleBoardProps) {
  const firstKey = props.squares[0]?.key ?? "";
  const [focusedKey, setFocusedKey] = useState(firstKey);
  const squareRefs = useRef(new Map<string, HTMLButtonElement>());
  const candidateKeys = new Set(props.candidateKeys ?? []);
  const selectedCreature = props.squares
    .map((square) => square.occupant)
    .find(
      (occupant) => occupant?.instanceId === props.selectedCreatureInstanceId
    );
  const pathStepsByKey = new Map<string, number[]>();
  for (const step of props.movementPathSteps ?? []) {
    const steps = pathStepsByKey.get(step.key) ?? [];
    steps.push(step.stepNumber);
    pathStepsByKey.set(step.key, steps);
  }

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
          const isMovementOrigin = props.movementOriginKey === square.key;
          const isProvisional = props.provisionalPositionKey === square.key;
          const pathSteps = pathStepsByKey.get(square.key) ?? [];
          const hidesConfirmedCreature =
            selectedCreature &&
            square.occupant?.instanceId === selectedCreature.instanceId &&
            isMovementOrigin &&
            !isProvisional;
          const displayedOccupant =
            selectedCreature && isProvisional
              ? selectedCreature
              : hidesConfirmedCreature
                ? undefined
                : square.occupant;

          return (
            <button
              key={square.key}
              aria-label={describeSquare(
                square,
                displayedOccupant?.name,
                isCandidate,
                isSelected,
                isMovementOrigin,
                isProvisional,
                pathSteps
              )}
              aria-selected={isSelected || isProvisional || undefined}
              className={[
                "battle-square",
                `battle-square--${square.terrain}`,
                displayedOccupant ? "battle-square--occupied" : "",
                isCandidate ? "battle-square--candidate" : "",
                isSelected ? "battle-square--selected" : "",
                isMovementOrigin ? "battle-square--movement-origin" : "",
                pathSteps.length > 0 ? "battle-square--movement-path" : "",
                isProvisional ? "battle-square--provisional" : ""
              ].join(" ")}
              data-testid={`battle-square-${square.coordinate.column}-${square.coordinate.row}`}
              disabled={props.interactionDisabled}
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
                if (displayedOccupant) {
                  props.onCreatureIntent?.(displayedOccupant.instanceId);
                } else {
                  props.onSquareIntent?.(square.coordinate);
                }
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
              {displayedOccupant ? (
                <BattleCard card={displayedOccupant} mode="board" />
              ) : null}
              {isMovementOrigin ? (
                <span
                  aria-hidden="true"
                  className="battle-square__movement-origin"
                  data-testid="battle-movement-origin-marker"
                >
                  O
                </span>
              ) : null}
              {pathSteps.length > 0 ? (
                <span
                  aria-hidden="true"
                  className="battle-square__movement-steps"
                >
                  {pathSteps.map((stepNumber) => (
                    <span
                      key={stepNumber}
                      data-testid={`battle-movement-step-${stepNumber}`}
                    >
                      {stepNumber}
                    </span>
                  ))}
                </span>
              ) : null}
              {square.terrain !== "normal" ? (
                <span className={`battle-square__base-label battle-square__base-label--${square.base?.owner ?? "none"}`} data-testid={`battle-base-${square.base?.id ?? square.key}`}>
                  <strong>{square.base?.label ?? terrainLabel(square.terrain)}</strong>
                  {square.base ? <span>{ownerLabel(square.base.owner)} · HP {square.base.currentHp}/{square.base.maxHp}</span> : null}
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
  occupantName: string | undefined,
  isCandidate: boolean,
  isSelected: boolean,
  isMovementOrigin: boolean,
  isProvisional: boolean,
  pathSteps: readonly number[]
): string {
  const prefix = `Column ${square.coordinate.column}, row ${square.coordinate.row}`;
  const baseLabel = square.base
    ? `, ${square.base.label}, ${ownerLabel(square.base.owner)}, health ${square.base.currentHp} of ${square.base.maxHp}`
    : "";
  const labels = [
    isSelected ? "selected summon destination" : undefined,
    isCandidate ? "available destination" : undefined,
    isMovementOrigin ? "movement origin" : undefined,
    pathSteps.length > 0 ? `movement path steps ${pathSteps.join(", ")}` : undefined,
    isProvisional ? "provisional creature position" : undefined
  ].filter((label): label is string => Boolean(label));
  const interactionLabel = labels.length > 0 ? `, ${labels.join(", ")}` : "";
  if (occupantName) {
    return `${prefix}, ${terrainLabel(square.terrain)}${baseLabel}, occupied by ${occupantName}${interactionLabel}`;
  }

  return `${prefix}, ${terrainLabel(square.terrain)}${baseLabel}${interactionLabel}`;
}

function ownerLabel(owner: "none" | "player" | "cpu"): string {
  return owner === "none" ? "Unclaimed" : owner === "player" ? "Player controlled" : "CPU controlled";
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
