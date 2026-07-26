import type { CardId, DeckCardRow } from "@ankake/domain";
import { CardImage } from "./CardImage";

export interface DeckCardGridProps {
  readonly cardRows: readonly DeckCardRow[];
  readonly onAddCard: (cardId: CardId) => void;
  readonly onOpenCardDetail: (cardId: CardId) => void;
}

export function DeckCardGrid({ cardRows, onAddCard, onOpenCardDetail }: DeckCardGridProps) {
  return (
    <section className="deck-card-grid-section" aria-labelledby="card-grid-title">
      <div className="deck-panel-heading">
        <h2 id="card-grid-title">Cards</h2>
        <span data-testid="card-grid-result-count">{cardRows.length}</span>
      </div>
      <div className="deck-card-grid" data-testid="deck-card-grid">
        {cardRows.map((row) => (
          <article
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
              <CardImage card={row.card} />
            </button>
            <div className="deck-card-tile__body">
              <h3>{row.card.name}</h3>
              <p>
                {row.card.type} / {row.card.attribute} / cost {row.card.cost}
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
                  Add
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
