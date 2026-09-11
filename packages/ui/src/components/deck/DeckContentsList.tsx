import type { CardId, DeckContentsRow } from "@ankake/domain";
import { CardImage } from "./CardImage";
import { localizeCardPresentation, type UiLocale, uiText } from "../../localization";

export interface DeckContentsListProps {
  readonly rows: readonly DeckContentsRow[];
  readonly onAddCard: (cardId: CardId) => void;
  readonly onRemoveCard: (cardId: CardId) => void;
  readonly onOpenCardDetail: (cardId: CardId) => void;
  readonly locale?: UiLocale;
}

export function DeckContentsList({
  rows,
  onAddCard,
  onRemoveCard,
  onOpenCardDetail,
  locale
}: DeckContentsListProps) {
  return (
    <section className="deck-contents-panel" aria-labelledby="deck-contents-title">
      <div className="deck-panel-heading">
        <h2 id="deck-contents-title">{uiText(locale, "deck.contents")}</h2>
        <span data-testid="deck-contents-count">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="deck-empty">{uiText(locale, "deck.add-cards")}</p>
      ) : (
        <ol className="deck-contents-list" data-testid="deck-contents-list">
          {rows.map((row) => {
            const displayCard = localizeCardPresentation(row.card, locale);

            return <li key={row.card.id} data-testid={`deck-contents-row-${row.card.id}`}>
              <button
                type="button"
                className="deck-contents-card-link"
                onClick={() => onOpenCardDetail(row.card.id)}
              >
                <CardImage
                  card={row.card}
                  className="deck-contents-card-image"
                  locale={locale}
                  {...displayCard}
                />
                <span className="deck-contents-card-name">{displayCard.name}</span>
              </button>
              <span>x{row.count}</span>
              <button
                type="button"
                className="deck-icon-button"
                aria-label={`${uiText(locale, "deck.remove")} ${displayCard.name}`}
                data-testid={`deck-contents-remove-button-${row.card.id}`}
                disabled={!row.canRemove}
                onClick={() => onRemoveCard(row.card.id)}
              >
                -
              </button>
              <button
                type="button"
                className="deck-icon-button"
                aria-label={`${uiText(locale, "deck.add")} ${displayCard.name}`}
                data-testid={`deck-contents-add-button-${row.card.id}`}
                disabled={!row.canAdd}
                onClick={() => onAddCard(row.card.id)}
              >
                +
              </button>
            </li>;
          })}
        </ol>
      )}
    </section>
  );
}
