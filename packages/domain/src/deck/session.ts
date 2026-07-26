import { DEFAULT_CARD_SEARCH_CRITERIA } from "./search";
import {
  type CardSearchCriteria,
  type DeckDialogState,
  type DeckDraft,
  type SavedDeckSummary
} from "./types";

export interface DeckBuildingSession {
  readonly draft: DeckDraft;
  readonly savedDecks: readonly SavedDeckSummary[];
  readonly criteria: CardSearchCriteria;
  readonly selectedDeckId?: string;
  readonly dialog: DeckDialogState;
  readonly saving: boolean;
  readonly loading: boolean;
  readonly deleting: boolean;
}

export function createDeckBuildingSession(
  draft: DeckDraft,
  savedDecks: readonly SavedDeckSummary[]
): DeckBuildingSession {
  return {
    draft,
    savedDecks,
    criteria: DEFAULT_CARD_SEARCH_CRITERIA,
    selectedDeckId: draft.savedSnapshot?.deckId,
    dialog: { kind: "none" },
    saving: false,
    loading: false,
    deleting: false
  };
}

export function updateDeckBuildingSession(
  session: DeckBuildingSession,
  update: Partial<DeckBuildingSession>
): DeckBuildingSession {
  return {
    ...session,
    ...update
  };
}
