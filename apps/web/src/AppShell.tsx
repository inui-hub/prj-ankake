import {
  appStateReducer,
  createInitialAppSnapshot,
  projectMenuViewModel,
  type AppEvent,
  type DiagnosticEvent,
  type MenuActionId,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import {
  BattlePreparationScreen,
  BattleScreen,
  DeckBuildingScreen,
  DialogOverlayHost,
  MenuScreen
} from "@ankake/ui";
import { useEffect, useMemo, useReducer } from "react";
import { useBattleController } from "./battle/useBattleController";
import { createDeckRepository } from "./deck/createDeckRepository";
import { useDeckBuildingController } from "./deck/useDeckBuildingController";
import { createUow001DestinationCapabilities } from "./routes/routes";
import { runStartup } from "./startup/startupOrchestrator";

export function AppShell() {
  const destinationCapabilities = useMemo(() => createUow001DestinationCapabilities(), []);
  const [snapshot, dispatch] = useReducer(appStateReducer, createInitialAppSnapshot());
  const viewModel = projectMenuViewModel(snapshot, destinationCapabilities);

  useEffect(() => {
    let cancelled = false;

    runStartup({
      destinationCapabilities,
      recordDiagnostic: recordLocalDiagnostic
    }).then((event: AppEvent) => {
      if (!cancelled) {
        dispatch(event);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [destinationCapabilities]);

  useEffect(() => {
    if (snapshot.kind === "navigation-pending") {
      dispatch({
        type: "transition-succeeded",
        routeId: snapshot.targetRoute
      });
    }
  }, [snapshot]);

  function handleActionSelected(actionId: MenuActionId): void {
    dispatch({
      type: "menu-action-requested",
      actionId
    });
  }

  function handleReloadRequested(): void {
    window.location.reload();
  }

  function handleReturnToMenu(): void {
    dispatch({
      type: "route-selected",
      routeId: "menu"
    });
  }

  if (snapshot.kind === "ready" && snapshot.currentRoute === "deck-building") {
    return <DeckBuildingRoute catalog={snapshot.catalog} onReturnToMenu={handleReturnToMenu} />;
  }

  if (snapshot.kind === "ready" && snapshot.currentRoute === "battle-preparation") {
    return <BattleRoute catalog={snapshot.catalog} onReturnToMenu={handleReturnToMenu} />;
  }

  return (
    <>
      <MenuScreen viewModel={viewModel} onActionSelected={handleActionSelected} />
      <DialogOverlayHost viewModel={viewModel} onReloadRequested={handleReloadRequested} />
    </>
  );
}

interface BattleRouteProps {
  readonly catalog: StaticCatalogSnapshot;
  readonly onReturnToMenu: () => void;
}

function BattleRoute({ catalog, onReturnToMenu }: BattleRouteProps) {
  const repository = useMemo(() => createDeckRepository(catalog), [catalog]);
  const controller = useBattleController({
    catalog,
    repository,
    onReturnToMenu
  });

  if (controller.viewModel.kind === "preparation") {
    return (
      <BattlePreparationScreen
        viewModel={controller.viewModel.preparation}
        startDisabledReason={controller.viewModel.startDisabledReason}
        onReturnToMenu={controller.actions.returnToMenu}
        onSelectPlayerDeck={controller.actions.selectPlayerDeck}
        onSelectCpuDeck={controller.actions.selectCpuDeck}
        onFirstPlayerModeChange={controller.actions.setFirstPlayerMode}
        onStartBattle={() => {
          void controller.actions.startBattle();
        }}
      />
    );
  }

  return (
    <BattleScreen
      viewModel={controller.viewModel.publicView}
      interaction={controller.viewModel.interaction}
      logEntries={controller.viewModel.logEntries}
      cpuStatus={controller.viewModel.cpuStatus}
      onReturnToPreparation={controller.actions.quitBattle}
      onReturnToMenu={controller.actions.returnToMenu}
      onEndPlayPhase={() => {
        void controller.actions.endPlayPhase();
      }}
      onWaterBoost={(creatureInstanceId) => {
        void controller.actions.submitCommand({
          type: "boostCreatureMovement",
          side: "player",
          creatureInstanceId
        });
      }}
      onHandCardIntent={controller.actions.selectHandCard}
      onBoardCreatureIntent={controller.actions.selectBoardCreature}
      onBoardSquareIntent={controller.actions.selectBoardSquare}
      onEffectCandidateIntent={controller.actions.selectEffectCandidate}
      onConfirmInteraction={() => {
        void controller.actions.confirmInteraction();
      }}
      onCancelInteraction={controller.actions.cancelInteraction}
      onUndoInteraction={controller.actions.undoInteraction}
      onRematch={() => {
        void controller.actions.rematch();
      }}
      onQuitBattle={controller.actions.quitBattle}
    />
  );
}

interface DeckBuildingRouteProps {
  readonly catalog: StaticCatalogSnapshot;
  readonly onReturnToMenu: () => void;
}

function DeckBuildingRoute({ catalog, onReturnToMenu }: DeckBuildingRouteProps) {
  const repository = useMemo(() => createDeckRepository(catalog), [catalog]);
  const controller = useDeckBuildingController({
    catalog,
    repository,
    onReturnToMenu
  });

  return (
    <DeckBuildingScreen
      viewModel={controller.viewModel}
      saveDisabledReason={controller.actions.getSaveDisabledReason()}
      onReturnToMenu={controller.actions.returnToMenu}
      onSaveDeck={() => {
        void controller.actions.saveDeck();
      }}
      onCreateNewDeck={controller.actions.createNewDeck}
      onSelectSavedDeck={(deckId) => {
        void controller.actions.selectSavedDeck(deckId);
      }}
      onDeckNameChange={controller.actions.updateDeckName}
      onCriteriaChange={controller.actions.updateSearchCriteria}
      onResetCriteria={controller.actions.resetSearchCriteria}
      onAddCard={controller.actions.addCard}
      onRemoveCard={controller.actions.removeCard}
      onOpenCardDetail={controller.actions.openCardDetail}
      onCloseDialog={controller.actions.closeDialog}
      onRequestDeleteDeck={controller.actions.requestDeleteDeck}
      onConfirmDeleteDeck={(deckId) => {
        void controller.actions.confirmDeleteDeck(deckId);
      }}
      onResolveUnsavedChanges={(choice) => {
        void controller.actions.resolveUnsavedChanges(choice);
      }}
    />
  );
}

function recordLocalDiagnostic(event: DiagnosticEvent): void {
  if (event.level === "error") {
    console.error("[ankake]", event.category, event.message, event.details ?? []);
    return;
  }

  console.info("[ankake]", event.category, event.message, event.details ?? []);
}
