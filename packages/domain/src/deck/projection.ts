import type { CardMasterRecord, StaticCatalogSnapshot } from "../catalog/types";
import {
  createDeckStats,
  getDeckCardsWithRecords,
  getDeckTotalCount,
  isDraftDirty
} from "./operations";
import { searchDeckBuildableCards, DEFAULT_CARD_SEARCH_CRITERIA } from "./search";
import {
  DECK_MAX_CARD_COPIES,
  DECK_BATTLE_READY_CARD_COUNT,
  DECK_MAX_SAVED_DECKS,
  type CardSearchCriteria,
  type DeckBuildingViewModel,
  type DeckCapState,
  type DeckContentsRow,
  type DeckDialogState,
  type DeckDraft,
  type SavedDeckSummary
} from "./types";
import { getPrimaryDeckValidationMessage, validateDeckDraft } from "./validation";

export interface ProjectDeckBuildingInput {
  readonly catalog: StaticCatalogSnapshot;
  readonly draft: DeckDraft;
  readonly savedDecks: readonly SavedDeckSummary[];
  readonly criteria?: CardSearchCriteria;
  readonly selectedDeckId?: string;
  readonly saving?: boolean;
  readonly loading?: boolean;
  readonly deleting?: boolean;
  readonly dialog?: DeckDialogState;
}

export function projectDeckBuildingViewModel(
  input: ProjectDeckBuildingInput
): DeckBuildingViewModel {
  const criteria = input.criteria ?? DEFAULT_CARD_SEARCH_CRITERIA;
  const validation = validateDeckDraft(input.draft, input.catalog);
  const dialog = input.dialog ?? { kind: "none" };

  return {
    draft: input.draft,
    savedDecks: input.savedDecks,
    selectedDeckId: input.selectedDeckId,
    criteria,
    cardRows: searchDeckBuildableCards(input.catalog, input.draft, criteria),
    deckContents: projectDeckContents(input.catalog, input.draft),
    stats: createDeckStats(input.draft.cards, input.catalog),
    validation,
    dirty: isDraftDirty(input.draft),
    saving: input.saving ?? false,
    loading: input.loading ?? false,
    deleting: input.deleting ?? false,
    capState: projectDeckCapState(input.savedDecks.length),
    selectedCard: getSelectedCard(input.catalog, dialog),
    dialog
  };
}

export function projectDeckContents(
  catalog: StaticCatalogSnapshot,
  draft: DeckDraft
): readonly DeckContentsRow[] {
  const totalCards = getDeckTotalCount(draft.cards);

  return getDeckCardsWithRecords(draft.cards, catalog).map((entry) => ({
    card: entry.card,
    count: entry.count,
    canAdd:
      entry.count < DECK_MAX_CARD_COPIES && totalCards < DECK_BATTLE_READY_CARD_COUNT,
    canRemove: entry.count > 0
  }));
}

export function projectDeckCapState(savedDeckCount: number): DeckCapState {
  return {
    maxDecks: DECK_MAX_SAVED_DECKS,
    savedDeckCount,
    reached: savedDeckCount >= DECK_MAX_SAVED_DECKS
  };
}

export function getSaveDisabledReason(viewModel: DeckBuildingViewModel): string | undefined {
  if (viewModel.saving) {
    return "Saving deck.";
  }

  if (!viewModel.dirty) {
    return "No changes to save.";
  }

  if (!viewModel.validation.saveable) {
    return getPrimaryDeckValidationMessage(viewModel.validation);
  }

  return undefined;
}

function getSelectedCard(
  catalog: StaticCatalogSnapshot,
  dialog: DeckDialogState
): CardMasterRecord | undefined {
  if (dialog.kind !== "card-detail") {
    return undefined;
  }

  return catalog.cardsById.get(dialog.cardId);
}
