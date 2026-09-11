import type { DeckBuildingViewModel, DeckId } from "@ankake/domain";
import { localizeDeckValidationIssue, type UiLocale, uiText } from "../../localization";

export interface DeckInfoPanelProps {
  readonly viewModel: DeckBuildingViewModel;
  readonly onDeckNameChange: (name: string) => void;
  readonly onAutoBuildDeck: () => void;
  readonly onRequestDeleteDeck: (deckId: DeckId) => void;
  readonly locale?: UiLocale;
}

export function DeckInfoPanel({
  viewModel,
  onDeckNameChange,
  onAutoBuildDeck,
  onRequestDeleteDeck,
  locale
}: DeckInfoPanelProps) {
  const savedDeckId = viewModel.draft.savedSnapshot?.deckId;

  return (
    <section className="deck-info-panel" aria-labelledby="deck-info-title">
      <h2 id="deck-info-title">{uiText(locale, "deck.deck")}</h2>
      <label className="deck-field">
        <span>{uiText(locale, "deck.name")}</span>
        <input
          value={viewModel.draft.name}
          maxLength={30}
          data-testid="deck-name-input"
          onChange={(event) => onDeckNameChange(event.currentTarget.value)}
        />
      </label>
      <div className="deck-readiness" data-testid="deck-readiness-status">
        <strong>{viewModel.validation.cardCount}/40</strong>
        <span>{viewModel.validation.battleReady ? uiText(locale, "deck.battle-ready") : uiText(locale, "deck.draft")}</span>
      </div>
      <button
        type="button"
        className="deck-button deck-button--secondary deck-button--full"
        data-testid="deck-auto-build-button"
        disabled={viewModel.validation.cardCount >= 40 || viewModel.loading || viewModel.saving || viewModel.deleting}
        onClick={onAutoBuildDeck}
      >
        {uiText(locale, "deck.auto-build")}
      </button>
      {viewModel.validation.issues.length > 0 ? (
        <ul className="deck-validation-list" data-testid="deck-validation-list">
          {viewModel.validation.issues.map((issue) => (
            <li key={`${issue.code}-${issue.cardId ?? "deck"}`}>{localizeDeckValidationIssue(locale, issue.code, issue.message)}</li>
          ))}
        </ul>
      ) : null}
      {savedDeckId ? (
        <button
          type="button"
          className="deck-button deck-button--danger deck-button--full"
          data-testid="deck-delete-request-button"
          onClick={() => onRequestDeleteDeck(savedDeckId)}
        >
          {uiText(locale, "deck.delete-deck")}
        </button>
      ) : null}
    </section>
  );
}
