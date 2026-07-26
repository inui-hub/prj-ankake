import type { DeckId } from "@ankake/domain";

export interface DeleteDeckDialogProps {
  readonly deckId: DeckId;
  readonly onConfirm: (deckId: DeckId) => void;
  readonly onCancel: () => void;
}

export function DeleteDeckDialog({ deckId, onConfirm, onCancel }: DeleteDeckDialogProps) {
  return (
    <div className="deck-modal-backdrop">
      <section
        className="deck-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-deck-title"
        data-testid="delete-deck-dialog"
      >
        <h2 id="delete-deck-title">Delete Deck</h2>
        <p>This saved deck will be removed from this browser.</p>
        <div className="deck-modal__actions">
          <button
            type="button"
            className="deck-button deck-button--quiet"
            data-testid="delete-deck-cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="deck-button deck-button--danger"
            data-testid="delete-deck-confirm-button"
            onClick={() => onConfirm(deckId)}
          >
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}
