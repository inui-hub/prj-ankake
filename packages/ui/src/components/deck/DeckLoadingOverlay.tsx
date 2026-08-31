import { type UiLocale, uiText } from "../../localization";

export interface DeckLoadingOverlayProps {
  readonly active: boolean;
  readonly locale?: UiLocale;
}

export function DeckLoadingOverlay({ active, locale }: DeckLoadingOverlayProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="blocking-overlay" data-testid="deck-loading-overlay">
      <div className="loading-panel">
        <span className="loading-panel__spinner" aria-hidden="true" />
        <span>{uiText(locale, "deck.loading")}</span>
      </div>
    </div>
  );
}
