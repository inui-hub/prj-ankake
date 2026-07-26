import {
  getCardCount,
  type CardId,
  type CardSearchCriteria,
  type DeckBuildingViewModel,
  type DeckId
} from "@ankake/domain";
import { CardDetailDialog } from "./CardDetailDialog";
import { CardSearchFilterBar } from "./CardSearchFilterBar";
import { DeckCardGrid } from "./DeckCardGrid";
import { DeckContentsList } from "./DeckContentsList";
import { DeckHeaderBar } from "./DeckHeaderBar";
import { DeckInfoPanel } from "./DeckInfoPanel";
import { DeckLoadingOverlay } from "./DeckLoadingOverlay";
import { DeckLocalDataErrorDialog } from "./DeckLocalDataErrorDialog";
import { DeckStatsPanel } from "./DeckStatsPanel";
import { DeleteDeckDialog } from "./DeleteDeckDialog";
import {
  UnsavedChangesDialog,
  type UnsavedChangesDialogChoice
} from "./UnsavedChangesDialog";
import { SavedDeckListPanel } from "./SavedDeckListPanel";

export interface DeckBuildingScreenProps {
  readonly viewModel: DeckBuildingViewModel;
  readonly saveDisabledReason?: string;
  readonly onReturnToMenu: () => void;
  readonly onSaveDeck: () => void;
  readonly onCreateNewDeck: () => void;
  readonly onSelectSavedDeck: (deckId: DeckId) => void;
  readonly onDeckNameChange: (name: string) => void;
  readonly onCriteriaChange: (criteria: CardSearchCriteria) => void;
  readonly onResetCriteria: () => void;
  readonly onAddCard: (cardId: CardId) => void;
  readonly onRemoveCard: (cardId: CardId) => void;
  readonly onOpenCardDetail: (cardId: CardId) => void;
  readonly onCloseDialog: () => void;
  readonly onRequestDeleteDeck: (deckId: DeckId) => void;
  readonly onConfirmDeleteDeck: (deckId: DeckId) => void;
  readonly onResolveUnsavedChanges: (choice: UnsavedChangesDialogChoice) => void;
}

export function DeckBuildingScreen(props: DeckBuildingScreenProps) {
  const { viewModel } = props;

  return (
    <main className="deck-screen" data-testid="deck-building-screen">
      <DeckHeaderBar
        viewModel={viewModel}
        saveDisabledReason={props.saveDisabledReason}
        onReturnToMenu={props.onReturnToMenu}
        onSaveDeck={props.onSaveDeck}
      />
      <div className="deck-shell">
        <SavedDeckListPanel
          savedDecks={viewModel.savedDecks}
          selectedDeckId={viewModel.selectedDeckId}
          capState={viewModel.capState}
          onCreateNewDeck={props.onCreateNewDeck}
          onSelectSavedDeck={props.onSelectSavedDeck}
        />
        <section className="deck-workspace">
          <CardSearchFilterBar
            criteria={viewModel.criteria}
            onCriteriaChange={props.onCriteriaChange}
            onResetCriteria={props.onResetCriteria}
          />
          <DeckCardGrid
            cardRows={viewModel.cardRows}
            onAddCard={props.onAddCard}
            onOpenCardDetail={props.onOpenCardDetail}
          />
        </section>
        <aside className="deck-detail-rail">
          <DeckInfoPanel
            viewModel={viewModel}
            onDeckNameChange={props.onDeckNameChange}
            onRequestDeleteDeck={props.onRequestDeleteDeck}
          />
          <DeckContentsList
            rows={viewModel.deckContents}
            onAddCard={props.onAddCard}
            onRemoveCard={props.onRemoveCard}
            onOpenCardDetail={props.onOpenCardDetail}
          />
          <DeckStatsPanel stats={viewModel.stats} />
        </aside>
      </div>
      <DeckLoadingOverlay active={viewModel.loading || viewModel.saving || viewModel.deleting} />
      {renderDialog(props)}
    </main>
  );
}

function renderDialog(props: DeckBuildingScreenProps) {
  const { viewModel } = props;

  switch (viewModel.dialog.kind) {
    case "card-detail": {
      const card = viewModel.selectedCard;

      if (!card) {
        return null;
      }

      const row = viewModel.cardRows.find((candidate) => candidate.card.id === card.id);

      return (
        <CardDetailDialog
          card={card}
          currentCount={getCardCount(viewModel.draft.cards, card.id)}
          canAdd={row?.canAdd ?? false}
          onAddCard={props.onAddCard}
          onRemoveCard={props.onRemoveCard}
          onClose={props.onCloseDialog}
        />
      );
    }
    case "delete-deck":
      return (
        <DeleteDeckDialog
          deckId={viewModel.dialog.deckId}
          onConfirm={props.onConfirmDeleteDeck}
          onCancel={props.onCloseDialog}
        />
      );
    case "unsaved-changes":
      return <UnsavedChangesDialog onChoose={props.onResolveUnsavedChanges} />;
    case "local-data-error":
      return (
        <DeckLocalDataErrorDialog
          title={viewModel.dialog.title}
          message={viewModel.dialog.message}
          onReturnToMenu={props.onCloseDialog}
        />
      );
    case "none":
      return null;
  }
}
