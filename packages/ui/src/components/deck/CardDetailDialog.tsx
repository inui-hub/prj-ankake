import type { CardId, CardMasterRecord } from "@ankake/domain";
import { CardImage } from "./CardImage";

export interface CardDetailDialogProps {
  readonly card: CardMasterRecord;
  readonly currentCount: number;
  readonly canAdd: boolean;
  readonly onAddCard: (cardId: CardId) => void;
  readonly onRemoveCard: (cardId: CardId) => void;
  readonly onClose: () => void;
}

export function CardDetailDialog({
  card,
  currentCount,
  canAdd,
  onAddCard,
  onRemoveCard,
  onClose
}: CardDetailDialogProps) {
  return (
    <div className="deck-modal-backdrop">
      <section
        className="deck-modal deck-modal--card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-detail-title"
        data-testid="card-detail-dialog"
      >
        <CardImage card={card} />
        <div className="deck-modal__content">
          <h2 id="card-detail-title">{card.name}</h2>
          <p>
            {card.type} / {card.attribute} / cost {card.cost}
          </p>
          {"attack" in card ? (
            <p>
              ATK {card.attack} / HP {card.health}
            </p>
          ) : null}
          <p>{card.effectText}</p>
          <div className="deck-modal__actions">
            <button
              type="button"
              className="deck-button deck-button--quiet"
              data-testid="card-detail-close-button"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="deck-button deck-button--secondary"
              data-testid="card-detail-remove-button"
              disabled={currentCount <= 0}
              onClick={() => onRemoveCard(card.id)}
            >
              Remove
            </button>
            <button
              type="button"
              className="deck-button deck-button--primary"
              data-testid="card-detail-add-button"
              disabled={!canAdd}
              onClick={() => onAddCard(card.id)}
            >
              Add ({currentCount}/4)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
