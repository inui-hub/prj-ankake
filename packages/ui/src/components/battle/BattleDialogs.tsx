import type { BattleCardView, BattleSide, BattleTerminalReason, PublicBattleView } from "@ankake/domain";
import { type UiLocale, uiText } from "../../localization";

export function BattleResultOverlay(props: {
  readonly viewModel: PublicBattleView;
  readonly onRematch: () => void;
  readonly onReturnToPreparation: () => void;
  readonly locale?: UiLocale;
  readonly interactionDisabled?: boolean;
}) {
  const result = props.viewModel.terminalResult;

  if (!result) {
    return null;
  }

  return (
    <div className="battle-modal-backdrop" data-testid="battle-result-overlay">
      <section className="battle-modal">
        <h2>{result.winner === "player" ? uiText(props.locale, "battle.result.victory") : uiText(props.locale, "battle.result.defeat")}</h2>
        <p data-testid="battle-result-reason">{uiText(props.locale, "battle.result.reason")}: {reasonLabel(result.reason, props.locale)}</p>
        <p data-testid="battle-result-turn">{uiText(props.locale, "battle.result.turn")}: {result.turnNumber}</p>
        <div className="battle-modal__actions">
          <button className="battle-button battle-button--primary" data-testid="battle-rematch-button" disabled={props.interactionDisabled} type="button" onClick={props.onRematch}>
            {uiText(props.locale, "battle.result.rematch")}
          </button>
          <button className="battle-button" data-testid="battle-result-return-button" disabled={props.interactionDisabled} type="button" onClick={props.onReturnToPreparation}>
            {uiText(props.locale, "battle.result.return")}
          </button>
        </div>
      </section>
    </div>
  );
}

function reasonLabel(reason: BattleTerminalReason, locale: UiLocale | undefined): string {
  return uiText(locale, `battle.result.${reason}`);
}

export function BattleGraveyardDialog(props: {
  readonly side: BattleSide;
  readonly cards: readonly BattleCardView[];
  readonly selectableCardIds?: readonly string[];
  readonly selectedCardIds?: readonly string[];
  readonly onSelectCard?: (id: string) => void;
  readonly onClose: () => void;
  readonly locale?: UiLocale;
}) {
  const selectable = props.selectableCardIds ? new Set(props.selectableCardIds) : undefined;
  const selected = new Set(props.selectedCardIds);
  const sideLabel = props.side === "player" ? (props.locale === "ja" ? "プレイヤー" : "Player") : "CPU";

  return <div className="battle-modal-backdrop battle-graveyard-backdrop" role="presentation">
    <section aria-label={`${sideLabel} ${props.locale === "ja" ? "墓地" : "graveyard"}`} aria-modal="true" className="battle-modal battle-graveyard-dialog" data-testid={`battle-${props.side}-graveyard-dialog`} role="dialog">
      <div className="battle-graveyard-dialog__header">
        <h2>{sideLabel} {props.locale === "ja" ? "墓地" : "graveyard"}</h2>
        <button className="battle-button battle-button--quiet" data-testid="battle-graveyard-close-button" type="button" onClick={props.onClose}>{props.locale === "ja" ? "閉じる" : "Close"}</button>
      </div>
      {props.cards.length === 0 ? <p>{props.locale === "ja" ? "墓地にカードはありません。" : "There are no cards in this graveyard."}</p> : <ol className="battle-graveyard-list">
        {props.cards.map((card) => {
          const canSelect = selectable?.has(card.instanceId) ?? false;
          const isSelected = selected.has(card.instanceId);
          return <li key={card.instanceId}>
            {selectable ? <button aria-pressed={isSelected} className={`battle-graveyard-card ${isSelected ? "battle-graveyard-card--selected" : ""}`} data-testid={`battle-graveyard-card-${card.instanceId}`} disabled={!canSelect} type="button" onClick={() => props.onSelectCard?.(card.instanceId)}>
              <CardSummary card={card} locale={props.locale} />
              <span>{isSelected ? (props.locale === "ja" ? "選択済み" : "Selected") : (props.locale === "ja" ? "選択" : "Select")}</span>
            </button> : <article className="battle-graveyard-card" data-testid={`battle-graveyard-card-${card.instanceId}`}><CardSummary card={card} locale={props.locale} /></article>}
          </li>;
        })}
      </ol>}
    </section>
  </div>;
}

function CardSummary(props: { readonly card: BattleCardView; readonly locale?: UiLocale }) {
  return <span className="battle-graveyard-card__summary">
    <strong>{props.card.name}</strong>
    <span>{props.locale === "ja" ? "コスト" : "Cost"} {props.card.currentCost ?? "-"}</span>
    <span>{props.card.type === "creature" || props.card.type === "creature-token" ? `${props.card.currentAttack ?? "-"}/${props.card.maxHp ?? "-"}` : props.card.type}</span>
  </span>;
}
