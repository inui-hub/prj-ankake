export type UnsavedChangesDialogChoice = "save" | "discard" | "cancel";

export interface UnsavedChangesDialogProps {
  readonly onChoose: (choice: UnsavedChangesDialogChoice) => void;
  readonly locale?: UiLocale;
}

export function UnsavedChangesDialog({ onChoose, locale }: UnsavedChangesDialogProps) {
  return (
    <div className="deck-modal-backdrop">
      <section
        className="deck-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        data-testid="unsaved-changes-dialog"
      >
        <h2 id="unsaved-changes-title">{uiText(locale, "deck.unsaved-changes")}</h2>
        <p>{uiText(locale, "deck.unsaved-message")}</p>
        <div className="deck-modal__actions">
          <button
            type="button"
            className="deck-button deck-button--quiet"
            data-testid="unsaved-cancel-button"
            onClick={() => onChoose("cancel")}
          >
            {uiText(locale, "deck.cancel")}
          </button>
          <button
            type="button"
            className="deck-button deck-button--secondary"
            data-testid="unsaved-discard-button"
            onClick={() => onChoose("discard")}
          >
            {uiText(locale, "deck.discard")}
          </button>
          <button
            type="button"
            className="deck-button deck-button--primary"
            data-testid="unsaved-save-button"
            onClick={() => onChoose("save")}
          >
            {uiText(locale, "deck.save")}
          </button>
        </div>
      </section>
    </div>
  );
}
import { type UiLocale, uiText } from "../../localization";
