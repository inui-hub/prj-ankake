import type { DeckBuildingViewModel } from "@ankake/domain";

export interface DeckHeaderBarProps {
  readonly viewModel: DeckBuildingViewModel;
  readonly saveDisabledReason?: string;
  readonly onReturnToMenu: () => void;
  readonly onSaveDeck: () => void;
}

export function DeckHeaderBar({
  viewModel,
  saveDisabledReason,
  onReturnToMenu,
  onSaveDeck
}: DeckHeaderBarProps) {
  return (
    <header className="deck-header">
      <button
        type="button"
        className="deck-button deck-button--quiet"
        data-testid="deck-header-return-menu-button"
        onClick={onReturnToMenu}
      >
        Menu
      </button>
      <div className="deck-header__title-group">
        <p className="deck-header__kicker">Deck Building</p>
        <h1 className="deck-header__title">{viewModel.draft.name || "Untitled Deck"}</h1>
      </div>
      <div className="deck-header__status" data-testid="deck-header-dirty-status">
        {viewModel.dirty ? "Unsaved" : "Saved"}
      </div>
      <button
        type="button"
        className="deck-button deck-button--primary"
        data-testid="deck-header-save-button"
        disabled={Boolean(saveDisabledReason)}
        title={saveDisabledReason}
        onClick={onSaveDeck}
      >
        Save
      </button>
    </header>
  );
}
