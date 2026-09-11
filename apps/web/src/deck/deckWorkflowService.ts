import {
  DEFAULT_CARD_SEARCH_CRITERIA,
  addCardToDraft,
  canCreateNewSavedDeck,
  createDraftFromSavedDeck,
  createNewDeckDraft,
  isDraftDirty,
  projectDeckBuildingViewModel,
  removeCardFromDraft,
  renameDeckDraft,
  toSavedDeck,
  validateDeckDraft,
  type CardId,
  type CardSearchCriteria,
  type DeckBuildingViewModel,
  type DeckDialogState,
  type DeckDraft,
  type DeckId,
  type PendingDeckIntent,
  type SavedDeckSummary,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import type {
  DeckRepository,
  PersistenceError,
  RepositoryResult
} from "@ankake/persistence";

export interface DeckWorkflowContext {
  readonly repository: DeckRepository;
  readonly catalog: StaticCatalogSnapshot;
  readonly now: () => string;
  readonly createDeckId: () => string;
}

export interface DeckWorkflowState {
  readonly draft: DeckDraft;
  readonly savedDecks: readonly SavedDeckSummary[];
  readonly criteria: CardSearchCriteria;
  readonly selectedDeckId?: DeckId;
  readonly dialog: DeckDialogState;
  readonly saving: boolean;
  readonly loading: boolean;
  readonly deleting: boolean;
}

export type DeckWorkflowResult =
  | {
      readonly ok: true;
      readonly state: DeckWorkflowState;
    }
  | {
      readonly ok: false;
      readonly state: DeckWorkflowState;
      readonly error: PersistenceError | Error;
    };

export function createDeckWorkflowLoadingState(
  context: DeckWorkflowContext
): DeckWorkflowState {
  return {
    draft: createNewDeckDraft({
      deckId: context.createDeckId(),
      now: context.now()
    }),
    savedDecks: [],
    criteria: DEFAULT_CARD_SEARCH_CRITERIA,
    dialog: { kind: "none" },
    saving: false,
    loading: true,
    deleting: false
  };
}

export async function enterDeckBuilding(
  context: DeckWorkflowContext
): Promise<DeckWorkflowResult> {
  const initialState = createDeckWorkflowLoadingState(context);
  const savedDecks = await context.repository.listDecks();

  if (!savedDecks.ok) {
    return failWithLocalDataError(initialState, savedDecks.error);
  }

  if (savedDecks.value.length === 0) {
    return {
      ok: true,
      state: {
        ...initialState,
        savedDecks: savedDecks.value,
        loading: false
      }
    };
  }

  const firstDeck = savedDecks.value[0];
  const loadedDeck = await context.repository.loadDeck(firstDeck.deckId);

  if (!loadedDeck.ok) {
    return failWithLocalDataError(
      {
        ...initialState,
        savedDecks: savedDecks.value
      },
      loadedDeck.error
    );
  }

  return {
    ok: true,
    state: {
      ...initialState,
      draft: createDraftFromSavedDeck(loadedDeck.value),
      savedDecks: savedDecks.value,
      selectedDeckId: loadedDeck.value.deckId,
      loading: false
    }
  };
}

export function projectDeckWorkflowState(
  context: Pick<DeckWorkflowContext, "catalog">,
  state: DeckWorkflowState
): DeckBuildingViewModel {
  return projectDeckBuildingViewModel({
    catalog: context.catalog,
    draft: state.draft,
    savedDecks: state.savedDecks,
    criteria: state.criteria,
    selectedDeckId: state.selectedDeckId,
    saving: state.saving,
    loading: state.loading,
    deleting: state.deleting,
    dialog: state.dialog
  });
}

export function updateDraftName(
  state: DeckWorkflowState,
  name: string
): DeckWorkflowState {
  return {
    ...state,
    draft: renameDeckDraft(state.draft, name)
  };
}

export function updateSearchCriteria(
  state: DeckWorkflowState,
  criteria: CardSearchCriteria
): DeckWorkflowState {
  return {
    ...state,
    criteria
  };
}

export function addDraftCard(
  context: Pick<DeckWorkflowContext, "catalog">,
  state: DeckWorkflowState,
  cardId: CardId
): DeckWorkflowState {
  const mutation = addCardToDraft(state.draft, cardId, context.catalog);
  return mutation.accepted
    ? {
        ...state,
        draft: mutation.draft
      }
    : state;
}

export function removeDraftCard(state: DeckWorkflowState, cardId: CardId): DeckWorkflowState {
  const mutation = removeCardFromDraft(state.draft, cardId);
  return mutation.accepted
    ? {
        ...state,
        draft: mutation.draft
      }
    : state;
}

export function openCardDetail(
  state: DeckWorkflowState,
  cardId: CardId
): DeckWorkflowState {
  return {
    ...state,
    dialog: {
      kind: "card-detail",
      cardId
    }
  };
}

export function requestDeleteDeck(state: DeckWorkflowState, deckId: DeckId): DeckWorkflowState {
  return {
    ...state,
    dialog: {
      kind: "delete-deck",
      deckId
    }
  };
}

export function openUnsavedChangesDialog(
  state: DeckWorkflowState,
  intent: PendingDeckIntent
): DeckWorkflowState {
  return {
    ...state,
    dialog: {
      kind: "unsaved-changes",
      intent
    }
  };
}

export function closeDeckDialog(state: DeckWorkflowState): DeckWorkflowState {
  return {
    ...state,
    dialog: { kind: "none" }
  };
}

export function shouldConfirmUnsavedChanges(state: DeckWorkflowState): boolean {
  return isDraftDirty(state.draft);
}

export function createNewDeckWorkflowState(
  context: DeckWorkflowContext,
  state: DeckWorkflowState
): DeckWorkflowState {
  return {
    ...state,
    draft: createNewDeckDraft({
      deckId: context.createDeckId(),
      now: context.now()
    }),
    selectedDeckId: undefined,
    dialog: { kind: "none" }
  };
}

export async function loadSavedDeckWorkflow(
  context: DeckWorkflowContext,
  state: DeckWorkflowState,
  deckId: DeckId
): Promise<DeckWorkflowResult> {
  const loadedDeck = await context.repository.loadDeck(deckId);

  if (!loadedDeck.ok) {
    return failWithLocalDataError(
      {
        ...state,
        loading: false
      },
      loadedDeck.error
    );
  }

  return {
    ok: true,
    state: {
      ...state,
      draft: createDraftFromSavedDeck(loadedDeck.value),
      selectedDeckId: loadedDeck.value.deckId,
      dialog: { kind: "none" },
      loading: false
    }
  };
}

export async function saveDeckWorkflow(
  context: DeckWorkflowContext,
  state: DeckWorkflowState
): Promise<DeckWorkflowResult> {
  const validation = validateDeckDraft(state.draft, context.catalog);

  if (!validation.saveable) {
    return {
      ok: false,
      state: {
        ...state,
        saving: false
      },
      error: new Error("Deck is not saveable.")
    };
  }

  const isNewSavedDeck = !state.draft.savedSnapshot;

  if (isNewSavedDeck && !canCreateNewSavedDeck(state.savedDecks.length)) {
    return {
      ok: false,
      state: {
        ...state,
        saving: false
      },
      error: new Error("Deck limit reached.")
    };
  }

  const savedDeck = toSavedDeck(state.draft, context.now());
  const saveResult = await context.repository.saveDeck(savedDeck);

  if (!saveResult.ok) {
    return failWithLocalDataError(
      {
        ...state,
        saving: false
      },
      saveResult.error
    );
  }

  const savedDecks = await context.repository.listDecks();

  if (!savedDecks.ok) {
    return failWithLocalDataError(
      {
        ...state,
        saving: false
      },
      savedDecks.error
    );
  }

  return {
    ok: true,
    state: {
      ...state,
      draft: createDraftFromSavedDeck(saveResult.value),
      savedDecks: savedDecks.value,
      selectedDeckId: saveResult.value.deckId,
      dialog: { kind: "none" },
      saving: false
    }
  };
}

export async function deleteSavedDeckWorkflow(
  context: DeckWorkflowContext,
  state: DeckWorkflowState,
  deckId: DeckId
): Promise<DeckWorkflowResult> {
  const deleteResult = await context.repository.deleteDeck(deckId);

  if (!deleteResult.ok) {
    return failWithLocalDataError(
      {
        ...state,
        deleting: false
      },
      deleteResult.error
    );
  }

  const savedDecks = await context.repository.listDecks();

  if (!savedDecks.ok) {
    return failWithLocalDataError(
      {
        ...state,
        deleting: false
      },
      savedDecks.error
    );
  }

  if (savedDecks.value.length === 0) {
    return {
      ok: true,
      state: {
        ...state,
        draft: createNewDeckDraft({
          deckId: context.createDeckId(),
          now: context.now()
        }),
        savedDecks: savedDecks.value,
        selectedDeckId: undefined,
        dialog: { kind: "none" },
        deleting: false
      }
    };
  }

  return loadSavedDeckWorkflow(
    context,
    {
      ...state,
      savedDecks: savedDecks.value,
      deleting: false
    },
    savedDecks.value[0].deckId
  );
}

export function failWithLocalDataError(
  state: DeckWorkflowState,
  error: PersistenceError
): DeckWorkflowResult {
  return {
    ok: false,
    state: {
      ...state,
      saving: false,
      loading: false,
      deleting: false,
      dialog: createLocalDataErrorDialog(error)
    },
    error
  };
}

function createLocalDataErrorDialog(error: PersistenceError): DeckDialogState {
  return {
    kind: "local-data-error",
    title: "Local deck data is unavailable",
    message: `${error.message} Return to the menu and try again.`
  };
}
