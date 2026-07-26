import type { DeckCapState, DeckId, SavedDeckSummary } from "@ankake/domain";

export interface SavedDeckListPanelProps {
  readonly savedDecks: readonly SavedDeckSummary[];
  readonly selectedDeckId?: DeckId;
  readonly capState: DeckCapState;
  readonly onCreateNewDeck: () => void;
  readonly onSelectSavedDeck: (deckId: DeckId) => void;
}

export function SavedDeckListPanel({
  savedDecks,
  selectedDeckId,
  capState,
  onCreateNewDeck,
  onSelectSavedDeck
}: SavedDeckListPanelProps) {
  return (
    <aside className="deck-side-panel" aria-labelledby="saved-decks-title">
      <div className="deck-panel-heading">
        <h2 id="saved-decks-title">Saved Decks</h2>
        <span data-testid="saved-deck-count">
          {capState.savedDeckCount}/{capState.maxDecks}
        </span>
      </div>
      <button
        type="button"
        className="deck-button deck-button--secondary deck-button--full"
        data-testid="saved-decks-new-button"
        onClick={onCreateNewDeck}
      >
        New Deck
      </button>
      {capState.reached ? (
        <p className="deck-note" data-testid="saved-decks-cap-reached">
          Local deck limit reached.
        </p>
      ) : null}
      <div className="saved-deck-list" data-testid="saved-deck-list-panel">
        {savedDecks.length === 0 ? (
          <p className="deck-empty">No saved decks yet.</p>
        ) : (
          savedDecks.map((deck) => (
            <button
              key={deck.deckId}
              type="button"
              className="saved-deck-row"
              aria-current={deck.deckId === selectedDeckId ? "true" : undefined}
              data-testid={`saved-deck-row-${deck.deckId}`}
              onClick={() => onSelectSavedDeck(deck.deckId)}
            >
              <span>{deck.name}</span>
              <span>
                {deck.cardCount} cards {deck.battleReady ? "Ready" : "Draft"}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
