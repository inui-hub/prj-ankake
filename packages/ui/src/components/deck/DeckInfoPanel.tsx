import type { DeckBuildingViewModel, DeckId } from "@ankake/domain";

export interface DeckInfoPanelProps {
  readonly viewModel: DeckBuildingViewModel;
  readonly onDeckNameChange: (name: string) => void;
  readonly onRequestDeleteDeck: (deckId: DeckId) => void;
}

export function DeckInfoPanel({
  viewModel,
  onDeckNameChange,
  onRequestDeleteDeck
}: DeckInfoPanelProps) {
  const savedDeckId = viewModel.draft.savedSnapshot?.deckId;

  return (
    <section className="deck-info-panel" aria-labelledby="deck-info-title">
      <h2 id="deck-info-title">Deck</h2>
      <label className="deck-field">
        <span>Name</span>
        <input
          value={viewModel.draft.name}
          maxLength={30}
          data-testid="deck-name-input"
          onChange={(event) => onDeckNameChange(event.currentTarget.value)}
        />
      </label>
      <div className="deck-readiness" data-testid="deck-readiness-status">
        <strong>{viewModel.validation.cardCount}/40</strong>
        <span>{viewModel.validation.battleReady ? "Battle-ready" : "Draft"}</span>
      </div>
      {viewModel.validation.issues.length > 0 ? (
        <ul className="deck-validation-list" data-testid="deck-validation-list">
          {viewModel.validation.issues.map((issue) => (
            <li key={`${issue.code}-${issue.cardId ?? "deck"}`}>{issue.message}</li>
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
          Delete Deck
        </button>
      ) : null}
    </section>
  );
}
