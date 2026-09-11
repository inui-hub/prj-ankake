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
  readonly onAutoBuildDeck: () => void;
  readonly onRemoveCard: (cardId: CardId) => void;
  readonly onOpenCardDetail: (cardId: CardId) => void;
  readonly onCloseDialog: () => void;
  readonly onRequestDeleteDeck: (deckId: DeckId) => void;
  readonly onConfirmDeleteDeck: (deckId: DeckId) => void;
  readonly onResolveUnsavedChanges: (choice: UnsavedChangesDialogChoice) => void;
  readonly locale?: "ja" | "en";
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
        locale={props.locale}
      />
      <div className="deck-shell">
        <SavedDeckListPanel
          savedDecks={viewModel.savedDecks}
          selectedDeckId={viewModel.selectedDeckId}
          capState={viewModel.capState}
          onCreateNewDeck={props.onCreateNewDeck}
          onSelectSavedDeck={props.onSelectSavedDeck}
          locale={props.locale}
        />
        <section className="deck-workspace">
          <DeckStatsPanel stats={viewModel.stats} locale={props.locale} />
          <CardSearchFilterBar
            criteria={viewModel.criteria}
            onCriteriaChange={props.onCriteriaChange}
            onResetCriteria={props.onResetCriteria}
            locale={props.locale}
          />
          <DeckCardGrid
            cardRows={viewModel.cardRows}
            onAddCard={props.onAddCard}
            onOpenCardDetail={props.onOpenCardDetail}
            locale={props.locale}
          />
        </section>
        <aside className="deck-detail-rail">
          <DeckInfoPanel
            viewModel={viewModel}
            onDeckNameChange={props.onDeckNameChange}
            onAutoBuildDeck={props.onAutoBuildDeck}
            onRequestDeleteDeck={props.onRequestDeleteDeck}
            locale={props.locale}
          />
          <DeckContentsList
            rows={viewModel.deckContents}
            onAddCard={props.onAddCard}
            onRemoveCard={props.onRemoveCard}
            onOpenCardDetail={props.onOpenCardDetail}
            locale={props.locale}
          />
        </aside>
      </div>
      <DeckLoadingOverlay active={viewModel.loading || viewModel.saving || viewModel.deleting} locale={props.locale} />
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
          locale={props.locale}
        />
      );
    }
    case "delete-deck":
      return (
        <DeleteDeckDialog
          deckId={viewModel.dialog.deckId}
          onConfirm={props.onConfirmDeleteDeck}
          onCancel={props.onCloseDialog}
          locale={props.locale}
        />
      );
    case "unsaved-changes":
      return <UnsavedChangesDialog onChoose={props.onResolveUnsavedChanges} locale={props.locale} />;
    case "local-data-error":
      return (
        <DeckLocalDataErrorDialog
          title={viewModel.dialog.title}
          message={viewModel.dialog.message}
          onReturnToMenu={props.onCloseDialog}
          locale={props.locale}
        />
      );
    case "none":
      return null;
  }
}
