export interface DeckLocalDataErrorDialogProps {
  readonly title: string;
  readonly message: string;
  readonly onReturnToMenu: () => void;
}

export function DeckLocalDataErrorDialog({
  title,
  message,
  onReturnToMenu
}: DeckLocalDataErrorDialogProps) {
  return (
    <div className="deck-modal-backdrop">
      <section
        className="deck-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="deck-local-data-error-title"
        data-testid="deck-local-data-error-dialog"
      >
        <h2 id="deck-local-data-error-title">{title}</h2>
        <p>{message}</p>
        <div className="deck-modal__actions">
          <button
            type="button"
            className="deck-button deck-button--primary"
            data-testid="deck-local-data-error-return-button"
            onClick={onReturnToMenu}
          >
            Return to Menu
          </button>
        </div>
      </section>
    </div>
  );
}
