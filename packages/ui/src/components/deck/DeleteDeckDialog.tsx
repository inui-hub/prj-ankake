import type { DeckId } from "@ankake/domain";
import { type UiLocale, uiText } from "../../localization";

export interface DeleteDeckDialogProps {
  readonly deckId: DeckId;
  readonly onConfirm: (deckId: DeckId) => void;
  readonly onCancel: () => void;
  readonly locale?: UiLocale;
}

export function DeleteDeckDialog({ deckId, onConfirm, onCancel, locale }: DeleteDeckDialogProps) {
  return (
    <div className="deck-modal-backdrop">
      <section
        className="deck-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-deck-title"
        data-testid="delete-deck-dialog"
      >
        <h2 id="delete-deck-title">{uiText(locale, "deck.delete-deck")}</h2>
        <p>{uiText(locale, "deck.delete-message")}</p>
        <div className="deck-modal__actions">
          <button
            type="button"
            className="deck-button deck-button--quiet"
            data-testid="delete-deck-cancel-button"
            onClick={onCancel}
          >
            {uiText(locale, "deck.cancel")}
          </button>
          <button
            type="button"
            className="deck-button deck-button--danger"
            data-testid="delete-deck-confirm-button"
            onClick={() => onConfirm(deckId)}
          >
            {uiText(locale, "deck.delete")}
          </button>
        </div>
      </section>
    </div>
  );
}
