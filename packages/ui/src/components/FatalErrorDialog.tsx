import type { FatalErrorState } from "@ankake/domain";

export interface FatalErrorDialogProps {
  readonly error: FatalErrorState;
  readonly onReloadRequested: () => void;
}

export function FatalErrorDialog({ error, onReloadRequested }: FatalErrorDialogProps) {
  return (
    <div className="blocking-overlay blocking-overlay--fatal">
      <section
        className="fatal-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fatal-dialog-title"
        aria-describedby="fatal-dialog-message"
        data-testid="fatal-error-dialog"
      >
        <h2 id="fatal-dialog-title">{error.title}</h2>
        <p id="fatal-dialog-message">{error.message}</p>
        {error.issues.length > 0 ? (
          <ul className="fatal-dialog__issues">
            {error.issues.slice(0, 4).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="fatal-dialog__button"
          data-testid="fatal-error-close-button"
          onClick={onReloadRequested}
        >
          Reload page
        </button>
      </section>
    </div>
  );
}
