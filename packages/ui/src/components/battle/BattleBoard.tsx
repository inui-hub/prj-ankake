import {
  BATTLE_BOARD_COLUMNS,
  BATTLE_BOARD_ROWS,
  getAdjacentBoardCoordinates,
  isInitialSummonCoordinate,
  type BattleCardView,
  type BattleBoardSquareView,
  type BattleEvent,
  type BoardCoordinate
} from "@ankake/domain";
import { useEffect, useRef, useState } from "react";
import { BattleCard } from "./BattleCard";
import baseIcon from "../../assets/base-icon.svg";
import { type UiLocale, uiText } from "../../localization";

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
  /** During effect targeting, every board click represents a board target. */
  readonly effectSelectionMode?: boolean;
  readonly interactionDisabled?: boolean;
  readonly onCreatureIntent?: (instanceId: string) => void;
  readonly onSquareIntent?: (coordinate: BoardCoordinate) => void;
  readonly locale?: "ja" | "en";
  readonly onCardInspect?: (card: BattleBoardSquareView["occupant"], element: HTMLElement, source: "pointer" | "focus" | "touch") => void;
  readonly onInspectLeave?: () => void;
  readonly onInspectBlur?: () => void;
  readonly animationEvent?: BattleEvent;
  /** A lethal target remains visible at 0 HP until its destruction event. */
  readonly defeatedCreature?: { readonly squareKey: string; readonly card: BattleCardView };
}

export function BattleBoard(props: BattleBoardProps) {
  const firstKey = props.squares[0]?.key ?? "";
  const [focusedKey, setFocusedKey] = useState(firstKey);
  const squareRefs = useRef(new Map<string, HTMLButtonElement>());
  const suppressTouchClickKey = useRef<string>();
  const candidateKeys = new Set(props.candidateKeys ?? []);
  // Keep the lane's existing background color visible. These keys only describe
  // the territory that can become a summon destination; occupancy is handled by
  // the stronger, interaction-specific candidate treatment below.
  const initialSummonKeys = new Set(
    props.squares
      .filter((square) => isInitialSummonCoordinate("player", square.coordinate))
      .map((square) => square.key)
  );
  const controlledBaseSummonKeys = new Set(
    props.squares
      .filter((square) => square.base?.kind === "neutral-base" && square.base.owner === "player")
      .flatMap((square) => getAdjacentBoardCoordinates(square.coordinate))
      .map((coordinate) => `${coordinate.column}:${coordinate.row}`)
  );
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
      <h2>{uiText(props.locale, "battle.board")}</h2>
      <div
        aria-label={uiText(props.locale, "battle.board")}
        className="battle-board"
        data-testid="battle-board"
        role="grid"
      >
        {props.squares.map((square) => {
          const isCandidate = candidateKeys.has(square.key);
          const isInitialSummonArea = initialSummonKeys.has(square.key);
          const isControlledBaseSummonArea = controlledBaseSummonKeys.has(square.key);
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
          const animatedOccupant = props.defeatedCreature?.squareKey === square.key
            ? props.defeatedCreature.card
            : displayedOccupant;
          const animationKind = animationForSquare(square, animatedOccupant?.instanceId, props.animationEvent);
          return (
            <button
              key={square.key}
              aria-label={describeSquare(
                square,
                animatedOccupant?.name,
                isCandidate,
                isSelected,
                isMovementOrigin,
                isProvisional,
                pathSteps,
                props.locale
              )}
              aria-selected={isSelected || isProvisional || undefined}
              className={[
                "battle-square",
                `battle-square--${square.terrain}`,
                isInitialSummonArea ? "battle-square--initial-summon-area" : "",
                isControlledBaseSummonArea ? "battle-square--controlled-base-summon-area" : "",
                animatedOccupant ? "battle-square--occupied" : "",
                isCandidate ? "battle-square--candidate" : "",
                isSelected ? "battle-square--selected" : "",
                isMovementOrigin ? "battle-square--movement-origin" : "",
                pathSteps.length > 0 ? "battle-square--movement-path" : "",
                isProvisional ? "battle-square--provisional" : "",
                animationKind ? `battle-square--anim-${animationKind}` : ""
              ].join(" ")}
              data-lane={square.lane}
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
              onClick={(event) => {
                if (suppressTouchClickKey.current === square.key) {
                  suppressTouchClickKey.current = undefined;
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                setFocusedKey(square.key);
                if (animatedOccupant && !props.effectSelectionMode) {
                  props.onCreatureIntent?.(animatedOccupant.instanceId);
                } else {
                  props.onSquareIntent?.(square.coordinate);
                }
              }}
              onFocus={() => setFocusedKey(square.key)}
              onPointerEnter={(event) => animatedOccupant && props.onCardInspect?.(animatedOccupant, event.currentTarget, "pointer")}
              onPointerLeave={props.onInspectLeave}
              onBlur={props.onInspectBlur}
              onPointerUp={(event) => {
                // Pen input follows the same inspect-before-activate contract as touch.
                if (event.pointerType !== "mouse" && animatedOccupant) {
                  suppressTouchClickKey.current = square.key;
                  props.onCardInspect?.(animatedOccupant, event.currentTarget, "touch");
                }
              }}
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
              {animatedOccupant ? (
                <BattleCard card={animatedOccupant} locale={props.locale} mode="board" animationKind={animationKind === "summon" || animationKind === "move" || animationKind === "damage" ? animationKind : undefined} />
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
                <span className={`battle-square__base-label battle-square__base-label--${square.base?.owner ?? "none"}`} data-base-owner={square.base?.owner ?? "none"} data-testid={`battle-base-${square.base?.id ?? square.key}`}>
                  <img alt={ownerLabel(square.base?.owner ?? "none", props.locale)} className="battle-square__base-icon" src={baseIcon} />
                  <span className="sr-only">{props.locale === "en" ? square.base?.label ?? terrainLabel(square.terrain, props.locale) : terrainLabel(square.terrain, props.locale)}</span>
                  {square.base ? <span className="battle-square__base-hp">{uiText(props.locale, "battle.health")} {square.base.currentHp}/{square.base.maxHp}</span> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function animationForSquare(
  square: BattleBoardSquareView,
  occupantId: string | undefined,
  event: BattleEvent | undefined
): "summon" | "move" | "damage" | "destroy" | "capture" | undefined {
  if (!event) return undefined;
  const targetId = typeof event.data?.targetId === "string" ? event.data.targetId : undefined;
  const baseId = typeof event.data?.baseId === "string" ? event.data.baseId : undefined;
  const previousColumn = typeof event.data?.previousColumn === "number" ? event.data.previousColumn : undefined;
  const previousRow = typeof event.data?.previousRow === "number" ? event.data.previousRow : undefined;
  if (event.type === "creature.summoned" && occupantId === event.instanceId) return "summon";
  if (event.type === "creature.moved" && occupantId === event.instanceId) return "move";
  if (event.type === "creature.damaged" && occupantId === targetId) return "damage";
  if (event.type === "creature.destroyed" && square.coordinate.column === previousColumn && square.coordinate.row === previousRow) return "destroy";
  if (event.type === "base.damaged" && square.base?.id === baseId) return "damage";
  if (event.type === "base.captured" && square.base?.id === baseId) return "capture";
  return undefined;
}

function describeSquare(
  square: BattleBoardSquareView,
  occupantName: string | undefined,
  isCandidate: boolean,
  isSelected: boolean,
  isMovementOrigin: boolean,
  isProvisional: boolean,
  pathSteps: readonly number[],
  locale: UiLocale | undefined
): string {
  const prefix = locale === "en"
    ? `${uiText(locale, "battle.column")} ${square.coordinate.column}, ${uiText(locale, "battle.row")} ${square.coordinate.row}`
    : `${uiText(locale, "battle.column")} ${square.coordinate.column}、${uiText(locale, "battle.row")} ${square.coordinate.row}`;
  const baseLabel = square.base
    ? `, ${locale === "en" ? square.base.label : terrainLabel(square.terrain, locale)}, ${ownerLabel(square.base.owner, locale)}, ${uiText(locale, "battle.health")} ${square.base.currentHp}/${square.base.maxHp}`
    : "";
  const labels = [
    isSelected ? uiText(locale, "battle.selected-summon") : undefined,
    isCandidate ? uiText(locale, "battle.available-destination") : undefined,
    isMovementOrigin ? uiText(locale, "battle.movement-origin") : undefined,
    pathSteps.length > 0 ? `${uiText(locale, "battle.movement-path")} ${pathSteps.join(", ")}` : undefined,
    isProvisional ? uiText(locale, "battle.provisional-position") : undefined
  ].filter((label): label is string => Boolean(label));
  const interactionLabel = labels.length > 0 ? `, ${labels.join(", ")}` : "";
  if (occupantName) {
    return `${prefix}, ${terrainLabel(square.terrain, locale)}${baseLabel}, ${uiText(locale, "battle.occupied-by")} ${occupantName}${interactionLabel}`;
  }

  return `${prefix}, ${terrainLabel(square.terrain, locale)}${baseLabel}${interactionLabel}`;
}

function ownerLabel(owner: "none" | "player" | "cpu", locale: "ja" | "en" = "ja"): string {
  if (locale === "ja") return owner === "none" ? "中立拠点" : owner === "player" ? "味方拠点" : "敵拠点";
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

function terrainLabel(terrain: BattleBoardSquareView["terrain"], locale: UiLocale | undefined): string {
  switch (terrain) {
    case "cpu-base":
      return uiText(locale, "battle.cpu-base");
    case "player-base":
      return uiText(locale, "battle.player-base");
    case "neutral-base":
      return uiText(locale, "battle.neutral-base");
    case "normal":
      return uiText(locale, "battle.normal-square");
  }
}
