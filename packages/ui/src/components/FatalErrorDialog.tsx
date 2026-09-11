import type { FatalErrorState } from "@ankake/domain";
import { localizeUserMessage } from "../localization";

export interface FatalErrorDialogProps {
  readonly error: FatalErrorState;
  readonly onReloadRequested: () => void;
  readonly locale?: "ja" | "en";
}

export function FatalErrorDialog({ error, onReloadRequested, locale }: FatalErrorDialogProps) {
  const ja = locale === "ja";
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
        <h2 id="fatal-dialog-title">{ja ? "アプリケーションを開始できません" : error.title}</h2>
        <p id="fatal-dialog-message">{ja ? "ローカルのカードカタログを読み込めませんでした。修正後に再読み込みしてください。" : error.message}</p>
        {error.issues.length > 0 ? (
          <ul className="fatal-dialog__issues">
            {error.issues.slice(0, 4).map((issue) => (
              <li key={issue}>{localizeUserMessage(locale, issue)}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="fatal-dialog__button"
          data-testid="fatal-error-close-button"
          onClick={onReloadRequested}
        >
          {ja ? "ページを再読み込み" : "Reload page"}
        </button>
      </section>
    </div>
  );
}
