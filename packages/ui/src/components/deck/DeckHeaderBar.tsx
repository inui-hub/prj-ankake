import type { DeckBuildingViewModel } from "@ankake/domain";
import { type UiLocale, uiText } from "../../localization";

export interface DeckHeaderBarProps {
  readonly viewModel: DeckBuildingViewModel;
  readonly saveDisabledReason?: string;
  readonly onReturnToMenu: () => void;
  readonly onSaveDeck: () => void;
  readonly locale?: UiLocale;
}

export function DeckHeaderBar({
  viewModel,
  saveDisabledReason,
  onReturnToMenu,
  onSaveDeck,
  locale
}: DeckHeaderBarProps) {
  return (
    <header className="deck-header">
      <button
        type="button"
        className="deck-button deck-button--quiet"
        data-testid="deck-header-return-menu-button"
        onClick={onReturnToMenu}
      >
        {uiText(locale, "deck.menu")}
      </button>
      <div className="deck-header__title-group">
        <p className="deck-header__kicker">{uiText(locale, "deck.title")}</p>
        <h1 className="deck-header__title">{viewModel.draft.name || uiText(locale, "deck.untitled")}</h1>
      </div>
      <div className="deck-header__status" data-testid="deck-header-dirty-status">
        {viewModel.dirty ? uiText(locale, "deck.unsaved") : uiText(locale, "deck.saved")}
      </div>
      <button
        type="button"
        className="deck-button deck-button--primary"
        data-testid="deck-header-save-button"
        disabled={Boolean(saveDisabledReason)}
        title={saveDisabledReason}
        onClick={onSaveDeck}
      >
        {uiText(locale, "deck.save")}
      </button>
    </header>
  );
}
