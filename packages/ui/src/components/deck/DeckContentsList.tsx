import type { CardId, DeckContentsRow } from "@ankake/domain";

export interface DeckContentsListProps {
  readonly rows: readonly DeckContentsRow[];
  readonly onAddCard: (cardId: CardId) => void;
  readonly onRemoveCard: (cardId: CardId) => void;
  readonly onOpenCardDetail: (cardId: CardId) => void;
}

export function DeckContentsList({
  rows,
  onAddCard,
  onRemoveCard,
  onOpenCardDetail
}: DeckContentsListProps) {
  return (
    <section className="deck-contents-panel" aria-labelledby="deck-contents-title">
      <div className="deck-panel-heading">
        <h2 id="deck-contents-title">Contents</h2>
        <span data-testid="deck-contents-count">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="deck-empty">Add cards from the list.</p>
      ) : (
        <ol className="deck-contents-list" data-testid="deck-contents-list">
          {rows.map((row) => (
            <li key={row.card.id} data-testid={`deck-contents-row-${row.card.id}`}>
              <button
                type="button"
                className="deck-link-button"
                onClick={() => onOpenCardDetail(row.card.id)}
              >
                {row.card.name}
              </button>
              <span>x{row.count}</span>
              <button
                type="button"
                className="deck-icon-button"
                aria-label={`Remove ${row.card.name}`}
                data-testid={`deck-contents-remove-button-${row.card.id}`}
                disabled={!row.canRemove}
                onClick={() => onRemoveCard(row.card.id)}
              >
                -
              </button>
              <button
                type="button"
                className="deck-icon-button"
                aria-label={`Add ${row.card.name}`}
                data-testid={`deck-contents-add-button-${row.card.id}`}
                disabled={!row.canAdd}
                onClick={() => onAddCard(row.card.id)}
              >
                +
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
