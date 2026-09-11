import type { DeckCapState, DeckId, SavedDeckSummary } from "@ankake/domain";
import { type UiLocale, uiText } from "../../localization";

export interface SavedDeckListPanelProps {
  readonly savedDecks: readonly SavedDeckSummary[];
  readonly selectedDeckId?: DeckId;
  readonly capState: DeckCapState;
  readonly onCreateNewDeck: () => void;
  readonly onSelectSavedDeck: (deckId: DeckId) => void;
  readonly locale?: UiLocale;
}

export function SavedDeckListPanel({
  savedDecks,
  selectedDeckId,
  capState,
  onCreateNewDeck,
  onSelectSavedDeck,
  locale
}: SavedDeckListPanelProps) {
  return (
    <aside className="deck-side-panel" aria-labelledby="saved-decks-title">
      <div className="deck-panel-heading">
        <h2 id="saved-decks-title">{uiText(locale, "deck.saved-decks")}</h2>
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
        {uiText(locale, "deck.new")}
      </button>
      {capState.reached ? (
        <p className="deck-note" data-testid="saved-decks-cap-reached">
          {uiText(locale, "deck.limit-reached")}
        </p>
      ) : null}
      <div className="saved-deck-list" data-testid="saved-deck-list-panel">
        {savedDecks.length === 0 ? (
          <p className="deck-empty">{uiText(locale, "deck.none-saved")}</p>
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
                {deck.cardCount} {uiText(locale, "deck.cards")} {deck.battleReady ? uiText(locale, "deck.battle-ready") : uiText(locale, "deck.draft")}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
