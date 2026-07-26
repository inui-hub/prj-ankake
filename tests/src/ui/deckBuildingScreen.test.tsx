import "@testing-library/jest-dom/vitest";
import {
  createNewDeckDraft,
  projectDeckBuildingViewModel
} from "@ankake/domain";
import { DeckBuildingScreen } from "@ankake/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";

function baseProps() {
  const draft = createNewDeckDraft({
    deckId: "deck-ui",
    now: "2026-07-25T00:00:00.000Z",
    name: "UI Deck"
  });
  const viewModel = projectDeckBuildingViewModel({
    catalog: validCatalogSnapshotFixture,
    draft,
    savedDecks: [],
    dialog: { kind: "none" }
  });

  return {
    viewModel,
    saveDisabledReason: "No changes to save.",
    onReturnToMenu: vi.fn(),
    onSaveDeck: vi.fn(),
    onCreateNewDeck: vi.fn(),
    onSelectSavedDeck: vi.fn(),
    onDeckNameChange: vi.fn(),
    onCriteriaChange: vi.fn(),
    onResetCriteria: vi.fn(),
    onAddCard: vi.fn(),
    onRemoveCard: vi.fn(),
    onOpenCardDetail: vi.fn(),
    onCloseDialog: vi.fn(),
    onRequestDeleteDeck: vi.fn(),
    onConfirmDeleteDeck: vi.fn(),
    onResolveUnsavedChanges: vi.fn()
  };
}

describe("deck building UI", () => {
  it("renders stable deck builder controls and disabled save state", () => {
    const props = baseProps();

    render(<DeckBuildingScreen {...props} />);

    expect(screen.getByTestId("deck-building-screen")).toBeInTheDocument();
    expect(screen.getByTestId("deck-header-save-button")).toBeDisabled();
    expect(screen.getByTestId("card-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("deck-card-grid")).toBeInTheDocument();
  });

  it("shows deck validation text", () => {
    const props = baseProps();
    const viewModel = projectDeckBuildingViewModel({
      catalog: validCatalogSnapshotFixture,
      draft: {
        ...props.viewModel.draft,
        name: ""
      },
      savedDecks: []
    });

    render(<DeckBuildingScreen {...props} viewModel={viewModel} />);

    expect(screen.getByTestId("deck-validation-list")).toHaveTextContent("Deck name is required");
  });

  it("renders the card detail dialog and image fallback", () => {
    const props = baseProps();
    const firstCard = validCatalogSnapshotFixture.cards[0];
    const viewModel = projectDeckBuildingViewModel({
      catalog: validCatalogSnapshotFixture,
      draft: props.viewModel.draft,
      savedDecks: [],
      dialog: { kind: "card-detail", cardId: firstCard.id }
    });

    render(<DeckBuildingScreen {...props} viewModel={viewModel} />);

    expect(screen.getByTestId("card-detail-dialog")).toBeInTheDocument();
    fireEvent.error(screen.getAllByTestId(`deck-card-image-${firstCard.id}`)[0]);
    expect(screen.getAllByTestId(`deck-card-image-fallback-${firstCard.id}`).length).toBeGreaterThan(0);
  });

  it("renders blocking unsaved changes and local data dialogs", () => {
    const props = baseProps();
    const unsavedViewModel = {
      ...props.viewModel,
      dialog: { kind: "unsaved-changes" as const, intent: { kind: "return-menu" as const } }
    };

    const { rerender } = render(<DeckBuildingScreen {...props} viewModel={unsavedViewModel} />);
    expect(screen.getByTestId("unsaved-changes-dialog")).toBeInTheDocument();

    rerender(
      <DeckBuildingScreen
        {...props}
        viewModel={{
          ...props.viewModel,
          dialog: {
            kind: "local-data-error",
            title: "Local deck data is unavailable",
            message: "Return to menu."
          }
        }}
      />
    );
    expect(screen.getByTestId("deck-local-data-error-dialog")).toBeInTheDocument();
  });
});
