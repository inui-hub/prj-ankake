import {
  DEFAULT_CARD_SEARCH_CRITERIA,
  getSaveDisabledReason as getProjectedSaveDisabledReason,
  type CardId,
  type CardSearchCriteria,
  type DeckBuildingViewModel,
  type DeckId,
  type PendingDeckIntent,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import type { DeckRepository } from "@ankake/persistence";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDraftCard,
  autoBuildDraftDeck,
  closeDeckDialog,
  createDeckWorkflowLoadingState,
  createNewDeckWorkflowState,
  deleteSavedDeckWorkflow,
  enterDeckBuilding,
  loadSavedDeckWorkflow,
  openCardDetail,
  openUnsavedChangesDialog,
  projectDeckWorkflowState,
  removeDraftCard,
  requestDeleteDeck,
  saveDeckWorkflow,
  shouldConfirmUnsavedChanges,
  updateDraftName,
  updateSearchCriteria,
  type DeckWorkflowContext,
  type DeckWorkflowState
} from "./deckWorkflowService";

export type UnsavedChangesChoice = "save" | "discard" | "cancel";

export interface DeckBuildingControllerActions {
  readonly returnToMenu: () => void;
  readonly saveDeck: () => Promise<void>;
  readonly createNewDeck: () => void;
  readonly selectSavedDeck: (deckId: DeckId) => Promise<void>;
  readonly updateDeckName: (name: string) => void;
  readonly updateSearchCriteria: (criteria: CardSearchCriteria) => void;
  readonly resetSearchCriteria: () => void;
  readonly addCard: (cardId: CardId) => void;
  readonly autoBuildDeck: () => void;
  readonly removeCard: (cardId: CardId) => void;
  readonly openCardDetail: (cardId: CardId) => void;
  readonly closeDialog: () => void;
  readonly requestDeleteDeck: (deckId: DeckId) => void;
  readonly confirmDeleteDeck: (deckId: DeckId) => Promise<void>;
  readonly resolveUnsavedChanges: (choice: UnsavedChangesChoice) => Promise<void>;
  readonly getSaveDisabledReason: () => string | undefined;
}

export interface DeckBuildingController {
  readonly viewModel: DeckBuildingViewModel;
  readonly actions: DeckBuildingControllerActions;
}

export interface UseDeckBuildingControllerOptions {
  readonly catalog: StaticCatalogSnapshot;
  readonly repository: DeckRepository;
  readonly onReturnToMenu: () => void;
  readonly now?: () => string;
  readonly createDeckId?: () => string;
}

export function useDeckBuildingController(
  options: UseDeckBuildingControllerOptions
): DeckBuildingController {
  const context = useMemo<DeckWorkflowContext>(
    () => ({
      catalog: options.catalog,
      repository: options.repository,
      now: options.now ?? defaultNow,
      createDeckId: options.createDeckId ?? defaultDeckId
    }),
    [options.catalog, options.repository, options.now, options.createDeckId]
  );
  const [workflowState, setWorkflowState] = useState<DeckWorkflowState>(() =>
    createDeckWorkflowLoadingState(context)
  );
  const stateRef = useRef(workflowState);

  useEffect(() => {
    stateRef.current = workflowState;
  }, [workflowState]);

  useEffect(() => {
    let cancelled = false;

    enterDeckBuilding(context).then((result) => {
      if (!cancelled) {
        setWorkflowState(result.state);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [context]);

  const viewModel = useMemo(
    () => projectDeckWorkflowState(context, workflowState),
    [context, workflowState]
  );

  const executeIntent = useCallback(
    async (intent: PendingDeckIntent, baseState?: DeckWorkflowState) => {
      const current = closeDeckDialog(baseState ?? stateRef.current);

      if (intent.kind === "return-menu") {
        setWorkflowState(current);
        options.onReturnToMenu();
        return;
      }

      if (intent.kind === "new-deck") {
        setWorkflowState(createNewDeckWorkflowState(context, current));
        return;
      }

      setWorkflowState({
        ...current,
        loading: true
      });
      const result = await loadSavedDeckWorkflow(context, current, intent.deckId);
      setWorkflowState(result.state);
    },
    [context, options]
  );

  const guardUnsaved = useCallback(
    (intent: PendingDeckIntent): boolean => {
      const current = stateRef.current;

      if (shouldConfirmUnsavedChanges(current)) {
        setWorkflowState(openUnsavedChangesDialog(current, intent));
        return true;
      }

      return false;
    },
    []
  );

  const saveDeck = useCallback(async () => {
    const current = stateRef.current;
    setWorkflowState({
      ...current,
      saving: true
    });
    const result = await saveDeckWorkflow(context, current);
    setWorkflowState(result.state);
  }, [context]);

  const actions: DeckBuildingControllerActions = useMemo(
    () => ({
      returnToMenu() {
        const intent: PendingDeckIntent = { kind: "return-menu" };

        if (!guardUnsaved(intent)) {
          void executeIntent(intent);
        }
      },
      async saveDeck() {
        await saveDeck();
      },
      createNewDeck() {
        const intent: PendingDeckIntent = { kind: "new-deck" };

        if (!guardUnsaved(intent)) {
          void executeIntent(intent);
        }
      },
      async selectSavedDeck(deckId) {
        const intent: PendingDeckIntent = {
          kind: "load-deck",
          deckId
        };

        if (!guardUnsaved(intent)) {
          await executeIntent(intent);
        }
      },
      updateDeckName(name) {
        setWorkflowState((current) => updateDraftName(current, name));
      },
      updateSearchCriteria(criteria) {
        setWorkflowState((current) => updateSearchCriteria(current, criteria));
      },
      resetSearchCriteria() {
        setWorkflowState((current) =>
          updateSearchCriteria(current, DEFAULT_CARD_SEARCH_CRITERIA)
        );
      },
      addCard(cardId) {
        setWorkflowState((current) => addDraftCard(context, current, cardId));
      },
      autoBuildDeck() {
        setWorkflowState((current) => autoBuildDraftDeck(context, current));
      },
      removeCard(cardId) {
        setWorkflowState((current) => removeDraftCard(current, cardId));
      },
      openCardDetail(cardId) {
        setWorkflowState((current) => openCardDetail(current, cardId));
      },
      closeDialog() {
        const current = stateRef.current;

        if (current.dialog.kind === "local-data-error") {
          setWorkflowState(closeDeckDialog(current));
          options.onReturnToMenu();
          return;
        }

        setWorkflowState(closeDeckDialog(current));
      },
      requestDeleteDeck(deckId) {
        setWorkflowState((current) => requestDeleteDeck(current, deckId));
      },
      async confirmDeleteDeck(deckId) {
        const current = stateRef.current;
        setWorkflowState({
          ...current,
          deleting: true
        });
        const result = await deleteSavedDeckWorkflow(context, current, deckId);
        setWorkflowState(result.state);
      },
      async resolveUnsavedChanges(choice) {
        const current = stateRef.current;

        if (current.dialog.kind !== "unsaved-changes") {
          return;
        }

        if (choice === "cancel") {
          setWorkflowState(closeDeckDialog(current));
          return;
        }

        if (choice === "discard") {
          await executeIntent(current.dialog.intent, current);
          return;
        }

        const saveResult = await saveDeckWorkflow(context, {
          ...current,
          saving: true
        });

        if (saveResult.ok) {
          await executeIntent(current.dialog.intent, saveResult.state);
          return;
        }

        setWorkflowState(saveResult.state);
      },
      getSaveDisabledReason() {
        return getProjectedSaveDisabledReason(viewModel);
      }
    }),
    [context, executeIntent, guardUnsaved, options, saveDeck, viewModel]
  );

  return {
    viewModel,
    actions
  };
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultDeckId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `deck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
