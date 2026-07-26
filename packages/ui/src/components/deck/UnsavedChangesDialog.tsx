export type UnsavedChangesDialogChoice = "save" | "discard" | "cancel";

export interface UnsavedChangesDialogProps {
  readonly onChoose: (choice: UnsavedChangesDialogChoice) => void;
}

export function UnsavedChangesDialog({ onChoose }: UnsavedChangesDialogProps) {
  return (
    <div className="deck-modal-backdrop">
      <section
        className="deck-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        data-testid="unsaved-changes-dialog"
      >
        <h2 id="unsaved-changes-title">Unsaved Changes</h2>
        <p>Choose how to handle the current deck before leaving it.</p>
        <div className="deck-modal__actions">
          <button
            type="button"
            className="deck-button deck-button--quiet"
            data-testid="unsaved-cancel-button"
            onClick={() => onChoose("cancel")}
          >
            Cancel
          </button>
          <button
            type="button"
            className="deck-button deck-button--secondary"
            data-testid="unsaved-discard-button"
            onClick={() => onChoose("discard")}
          >
            Discard
          </button>
          <button
            type="button"
            className="deck-button deck-button--primary"
            data-testid="unsaved-save-button"
            onClick={() => onChoose("save")}
          >
            Save
          </button>
        </div>
      </section>
    </div>
  );
}
