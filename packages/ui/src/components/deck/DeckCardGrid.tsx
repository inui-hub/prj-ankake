import type { CardId, DeckCardRow } from "@ankake/domain";
import { CardImage } from "./CardImage";
import { localizeCardPresentation, type UiLocale, uiText } from "../../localization";

export interface DeckCardGridProps {
  readonly cardRows: readonly DeckCardRow[];
  readonly onAddCard: (cardId: CardId) => void;
  readonly onOpenCardDetail: (cardId: CardId) => void;
  readonly locale?: UiLocale;
}

export function DeckCardGrid({ cardRows, onAddCard, onOpenCardDetail, locale }: DeckCardGridProps) {
  return (
    <section className="deck-card-grid-section" aria-labelledby="card-grid-title">
      <div className="deck-panel-heading">
        <h2 id="card-grid-title">{uiText(locale, "deck.cards")}</h2>
        <span data-testid="card-grid-result-count">{cardRows.length}</span>
      </div>
      <div className="deck-card-grid" data-testid="deck-card-grid">
        {cardRows.map((row) => {
          const displayCard = localizeCardPresentation(row.card, locale);

          return <article
            key={row.card.id}
            className="deck-card-tile"
            data-testid={`deck-card-row-${row.card.id}`}
          >
            <button
              type="button"
              className="deck-card-tile__image-button"
              data-testid={`deck-card-detail-button-${row.card.id}`}
              onClick={() => onOpenCardDetail(row.card.id)}
            >
              <CardImage card={row.card} locale={locale} {...displayCard} />
            </button>
            <div className="deck-card-tile__body">
              <h3>{displayCard.name}</h3>
              <p>
                {displayCard.type} / {displayCard.attribute} / {uiText(locale, "deck.cost")} {row.card.cost}
              </p>
              <div className="deck-card-tile__actions">
                <span data-testid={`deck-card-count-${row.card.id}`}>
                  {row.currentCount}/4
                </span>
                <button
                  type="button"
                  className="deck-button deck-button--small"
                  data-testid={`deck-card-add-button-${row.card.id}`}
                  disabled={!row.canAdd}
                  title={row.addDisabledReason}
                  onClick={() => onAddCard(row.card.id)}
                >
                  {uiText(locale, "deck.add")}
                </button>
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>
  );
}
