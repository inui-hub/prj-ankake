import type { BattleCardView } from "@ankake/domain";
import type { FocusEvent, PointerEvent } from "react";
import { useRef } from "react";
import { CardArtwork } from "../CardArtwork";
import { localizeBattleReason, localizeCardAttribute, localizeCardType, type UiLocale, uiText } from "../../localization";

export interface BattleCardProps {
  readonly card: BattleCardView;
  readonly mode: "hand" | "board";
  readonly isFocused?: boolean;
  readonly isSelected?: boolean;
  readonly interactionDisabled?: boolean;
  readonly onIntent?: (instanceId: string) => void;
  readonly onFocus?: (event: FocusEvent<HTMLElement>) => void;
  readonly onBlur?: (event: FocusEvent<HTMLElement>) => void;
  readonly onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerLeave?: () => void;
  readonly onTouchTap?: (event: PointerEvent<HTMLElement>) => void;
  readonly locale?: UiLocale;
  /** The card is currently resolving an attack on the board. */
  readonly isAttacking?: boolean;
  /** A short-lived, event-driven visual treatment. */
  readonly animationKind?: "summon" | "move" | "damage" | "destroy";
}

export function BattleCard(props: BattleCardProps) {
  const suppressTouchClick = useRef(false);
  const artwork = (
    <CardArtwork
      attribute={props.card.attribute}
      catalogCardId={props.card.catalogCardId}
      className="battle-card__artwork"
      fallbackClassName="battle-card__artwork--fallback"
      locale={props.locale}
      name={props.card.name}
      testIdPrefix="battle-card-artwork"
      type={props.card.type}
    />
  );
  const content =
    props.mode === "board" ? (
      <>
        {artwork}
        <BoardCardDetails card={props.card} locale={props.locale} />
      </>
    ) : (
      <>
        {artwork}
        <div className="battle-card__body">
          <strong className="battle-card__name">{props.card.name}</strong>
          <HandCardDetails card={props.card} locale={props.locale} />
        </div>
      </>
    );
  const className = [
    "battle-card",
    `battle-card--${props.mode}`,
    `battle-card--${props.card.controllerSide}`,
    props.mode === "board" && props.card.controllerSide !== "unknown"
      ? "battle-card--owner-highlight"
      : "",
    props.card.presentationStatus === "unavailable"
      ? "battle-card--unavailable"
      : "",
    props.isFocused ? "battle-card--focused" : "",
    props.isSelected ? "battle-card--selected" : "",
    props.isAttacking ? "battle-card--attacking" : "",
    props.animationKind ? `battle-card--anim-${props.animationKind}` : ""
  ]
    .filter(Boolean)
    .join(" ");

  if (props.mode === "board") {
    return (
      <div
        aria-label={describeCard(props.card, props.mode, props.locale)}
        className={className}
        data-testid={`battle-board-card-${props.card.instanceId}`}
        onPointerEnter={props.onPointerEnter}
        onPointerLeave={props.onPointerLeave}
      >
        {content}
      </div>
    );
  }

  const isDisabled = !props.card.isActionable || props.interactionDisabled;
  const reasonId = props.card.disabledReason
    ? `battle-card-reason-${props.card.instanceId}`
    : undefined;

  return (
    <button
      aria-disabled={isDisabled}
      aria-describedby={reasonId}
      aria-label={describeCard(props.card, props.mode, props.locale)}
      aria-pressed={props.isSelected ?? false}
      className={className}
      data-testid={`battle-hand-card-${props.card.instanceId}`}
      disabled={isDisabled}
      type="button"
      onClick={(event) => {
        if (suppressTouchClick.current) {
          suppressTouchClick.current = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!isDisabled) {
          props.onIntent?.(props.card.instanceId);
        }
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onPointerEnter={props.onPointerEnter}
      onPointerLeave={props.onPointerLeave}
      onPointerUp={(event) => {
        // jsdom does not populate pointerType; non-mouse pointers are taps.
        if (event.pointerType !== "mouse") {
          suppressTouchClick.current = true;
          props.onTouchTap?.(event);
        }
      }}
    >
      {content}
      {props.card.disabledReason ? (
        <span
          className="battle-card__reason"
          id={reasonId}
        >
          {localizeBattleReason(props.locale, props.card.disabledReason)}
        </span>
      ) : null}
    </button>
  );
}

function HandCardDetails({ card, locale }: { readonly card: BattleCardView; readonly locale: UiLocale | undefined }) {
  return (
    <>
      <span className="battle-card__meta">
        {localizeCardAttribute(locale, card.attribute)} / {localizeCardType(locale, card.type)}
      </span>
      {card.currentCost !== undefined ? (
        <span className="battle-card__cost">{uiText(locale, "battle.cost")} {card.currentCost}</span>
      ) : null}
      {isCreature(card) ? (
        <span className="battle-card__stats">
          {uiText(locale, "battle.attack")} {card.currentAttack ?? "?"} / {uiText(locale, "battle.health")} {formatHp(card)}
        </span>
      ) : null}
    </>
  );
}

function BoardCardDetails({ card, locale }: { readonly card: BattleCardView; readonly locale: UiLocale | undefined }) {
  return (
    <span className="battle-card__board-stats">
      <span className="battle-card__board-stat battle-card__board-stat--attack">
        {uiText(locale, "battle.attack")} {card.currentAttack ?? "?"}
      </span>
      <span className="battle-card__board-stat battle-card__board-stat--health">
        {uiText(locale, "battle.health")} {card.currentHp ?? "?"}
      </span>
    </span>
  );
}

function describeCard(
  card: BattleCardView,
  mode: BattleCardProps["mode"],
  locale: UiLocale | undefined
): string {
  const values = [
    card.name,
    localizeCardAttribute(locale, card.attribute),
    localizeCardType(locale, card.type),
    card.currentCost !== undefined
      ? `${uiText(locale, "battle.cost")} ${card.currentCost}`
      : undefined,
    isCreature(card) ? `${uiText(locale, "battle.attack")} ${card.currentAttack ?? uiText(locale, "battle.unknown")}` : undefined,
    isCreature(card) ? `${uiText(locale, "battle.health")} ${formatHp(card)}` : undefined,
    mode === "board" ? `${uiText(locale, "battle.controlled-by")} ${localizeOwnerLabel(card.ownerLabel, locale)}` : undefined,
    mode === "board" ? `${uiText(locale, "battle.status")} ${localizePresentationStatus(card.presentationStatus, locale)}` : undefined,
    card.disabledReason ? localizeBattleReason(locale, card.disabledReason) : undefined
  ];

  return values.filter(Boolean).join(", ");
}

function localizePresentationStatus(status: BattleCardView["presentationStatus"], locale: UiLocale | undefined): string {
  return uiText(locale, `battle.status.${status}`);
}

function localizeOwnerLabel(label: string, locale: UiLocale | undefined): string {
  if (label === "Player" || label === "Player controlled") return uiText(locale, "battle.player-controlled");
  if (label === "CPU" || label === "CPU controlled") return uiText(locale, "battle.cpu-controlled");
  if (label === "Unclaimed") return uiText(locale, "battle.unclaimed");
  if (label === "Unknown") return uiText(locale, "battle.unknown");
  return label;
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
