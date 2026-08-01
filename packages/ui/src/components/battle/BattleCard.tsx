import type { BattleCardView } from "@ankake/domain";
import type { FocusEvent } from "react";
import { CardArtwork } from "../CardArtwork";

export interface BattleCardProps {
  readonly card: BattleCardView;
  readonly mode: "hand" | "board";
  readonly isFocused?: boolean;
  readonly isSelected?: boolean;
  readonly onIntent?: (instanceId: string) => void;
  readonly onFocus?: (event: FocusEvent<HTMLElement>) => void;
}

export function BattleCard(props: BattleCardProps) {
  const artwork = (
    <CardArtwork
      attribute={props.card.attribute}
      catalogCardId={props.card.catalogCardId}
      className="battle-card__artwork"
      fallbackClassName="battle-card__artwork--fallback"
      name={props.card.name}
      testIdPrefix="battle-card-artwork"
      type={props.card.type}
    />
  );
  const content =
    props.mode === "board" ? (
      <>
        {artwork}
        <BoardCardDetails card={props.card} />
      </>
    ) : (
      <>
        {artwork}
        <div className="battle-card__body">
          <strong className="battle-card__name">{props.card.name}</strong>
          <HandCardDetails card={props.card} />
        </div>
      </>
    );
  const className = [
    "battle-card",
    `battle-card--${props.mode}`,
    `battle-card--${props.card.controllerSide}`,
    props.card.presentationStatus === "unavailable"
      ? "battle-card--unavailable"
      : "",
    props.isFocused ? "battle-card--focused" : "",
    props.isSelected ? "battle-card--selected" : ""
  ]
    .filter(Boolean)
    .join(" ");

  if (props.mode === "board") {
    return (
      <div
        aria-label={describeCard(props.card, props.mode)}
        className={className}
        data-testid={`battle-board-card-${props.card.instanceId}`}
      >
        {content}
      </div>
    );
  }

  const reasonId = props.card.disabledReason
    ? `battle-card-reason-${props.card.instanceId}`
    : undefined;

  return (
    <button
      aria-disabled={!props.card.isActionable}
      aria-describedby={reasonId}
      aria-label={describeCard(props.card, props.mode)}
      aria-pressed={props.isSelected ?? false}
      className={className}
      data-testid={`battle-hand-card-${props.card.instanceId}`}
      type="button"
      onClick={() => {
        if (props.card.isActionable) {
          props.onIntent?.(props.card.instanceId);
        }
      }}
      onFocus={props.onFocus}
    >
      {content}
      {props.card.disabledReason ? (
        <span
          className="battle-card__reason"
          id={reasonId}
        >
          {props.card.disabledReason}
        </span>
      ) : null}
    </button>
  );
}

function HandCardDetails({ card }: { readonly card: BattleCardView }) {
  return (
    <>
      <span className="battle-card__meta">
        {card.attribute} / {card.type}
      </span>
      {card.currentCost !== undefined ? (
        <span className="battle-card__cost">Cost {card.currentCost}</span>
      ) : null}
      {isCreature(card) ? (
        <span className="battle-card__stats">
          ATK {card.currentAttack ?? "?"} / HP {formatHp(card)}
        </span>
      ) : null}
    </>
  );
}

function BoardCardDetails({ card }: { readonly card: BattleCardView }) {
  return (
    <span className="battle-card__board-stats">
      <span className="battle-card__board-stat battle-card__board-stat--attack">
        ATK {card.currentAttack ?? "?"}
      </span>
      <span className="battle-card__board-stat battle-card__board-stat--health">
        HP {card.currentHp ?? "?"}
      </span>
    </span>
  );
}

function describeCard(
  card: BattleCardView,
  mode: BattleCardProps["mode"]
): string {
  const values = [
    card.name,
    card.attribute,
    card.type,
    mode === "hand" && card.currentCost !== undefined
      ? `cost ${card.currentCost}`
      : undefined,
    isCreature(card) ? `attack ${card.currentAttack ?? "unknown"}` : undefined,
    isCreature(card) ? `health ${formatHp(card)}` : undefined,
    mode === "board" ? `controlled by ${card.ownerLabel}` : undefined,
    card.disabledReason
  ];

  return values.filter(Boolean).join(", ");
}

function isCreature(card: BattleCardView): boolean {
  return card.type === "creature" || card.type === "creature-token";
}

function formatHp(card: BattleCardView): string {
  if (card.currentHp === undefined) {
    return "?";
  }

  return card.maxHp === undefined
    ? String(card.currentHp)
    : `${card.currentHp}/${card.maxHp}`;
}
