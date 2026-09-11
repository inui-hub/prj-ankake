import "@testing-library/jest-dom/vitest";
import {
  createNewDeckDraft,
  projectDeckBuildingViewModel
} from "@ankake/domain";
import { DeckBuildingScreen, localizeCardPresentation } from "@ankake/ui";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
    onAutoBuildDeck: vi.fn(),
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
    expect(screen.getByTestId("deck-header-return-menu-button")).toHaveTextContent("メニュー");
    expect(screen.getByTestId("deck-header-save-button")).toHaveTextContent("保存");
    expect(screen.getByTestId("deck-header-dirty-status")).toHaveTextContent("未保存");
    expect(screen.getByTestId("deck-auto-build-button")).toHaveTextContent("お任せで40枚にする");
    expect(screen.getByTestId("card-search-input").closest("section")).toHaveTextContent("検索");
  });

  it("requests automatic completion from the deck information panel", () => {
    const props = baseProps();

    render(<DeckBuildingScreen {...props} />);
    fireEvent.click(screen.getByTestId("deck-auto-build-button"));

    expect(props.onAutoBuildDeck).toHaveBeenCalledTimes(1);
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

    expect(screen.getByTestId("deck-validation-list")).toHaveTextContent("デッキ名を入力してください。");
  });

  it("propagates English locale to deck children and Japanese fallback to loading state", () => {
    const props = baseProps();
    const { rerender } = render(<DeckBuildingScreen {...props} locale="en" />);

    expect(screen.getByTestId("deck-header-return-menu-button")).toHaveTextContent("Menu");
    expect(screen.getByTestId("deck-header-save-button")).toHaveTextContent("Save");
    expect(screen.getByTestId("deck-card-grid").closest("section")).toHaveTextContent("Cards");
    expect(screen.getByTestId("deck-readiness-status")).toHaveTextContent("Draft");

    rerender(<DeckBuildingScreen {...props} viewModel={{ ...props.viewModel, loading: true }} />);
    expect(screen.getByTestId("deck-loading-overlay")).toHaveTextContent("デッキデータを読み込み中");
  });

  it("localizes deck card details and every sort label while keeping English catalog text", () => {
    const props = baseProps();
    const card = validCatalogSnapshotFixture.cards.find((candidate) => candidate.id === "AK-001");
    if (!card) throw new Error("AK-001 fixture card is required.");
    const viewModel = projectDeckBuildingViewModel({
      catalog: validCatalogSnapshotFixture,
      draft: props.viewModel.draft,
      savedDecks: [],
      dialog: { kind: "card-detail", cardId: card.id }
    });
    const japaneseCard = localizeCardPresentation(card, "ja");

    const { rerender } = render(<DeckBuildingScreen {...props} viewModel={viewModel} locale="ja" />);

    expect(screen.getByTestId(`deck-card-row-${card.id}`)).toHaveTextContent(japaneseCard.name);
    expect(screen.getByTestId(`deck-card-row-${card.id}`)).toHaveTextContent(`${japaneseCard.type} / ${japaneseCard.attribute}`);
    expect(screen.getByTestId("card-detail-dialog")).toHaveTextContent("火種のリクルート");
    expect(screen.getByTestId("card-detail-dialog")).toHaveTextContent("なし");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("名前順");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("コスト昇順");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("コスト降順");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("種類順");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("属性順");

    rerender(<DeckBuildingScreen {...props} viewModel={viewModel} locale="en" />);

    expect(screen.getByTestId(`deck-card-row-${card.id}`)).toHaveTextContent(card.name);
    expect(screen.getByTestId("card-detail-dialog")).toHaveTextContent(card.effectText);
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("Name");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("Cost up");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("Cost down");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("Type");
    expect(screen.getByTestId("card-sort-select")).toHaveTextContent("Attribute");
  });

  it("localizes card type and attribute enum values in filters and deck stats", () => {
    const props = baseProps();
    const { rerender } = render(<DeckBuildingScreen {...props} locale="ja" />);

    expect(screen.getByTestId("card-type-filter-select")).toHaveTextContent("クリーチャー");
    expect(screen.getByTestId("card-type-filter-select")).toHaveTextContent("スペル");
    expect(screen.getByTestId("card-attribute-filter-select")).toHaveTextContent("火");
    expect(screen.getByTestId("deck-stats-panel")).toHaveTextContent("クリーチャー:");
    expect(screen.getByTestId("deck-stats-panel")).toHaveTextContent("火:");

    rerender(<DeckBuildingScreen {...props} locale="en" />);
    expect(screen.getByTestId("card-type-filter-select")).toHaveTextContent("creature");
    expect(screen.getByTestId("card-attribute-filter-select")).toHaveTextContent("fire");
  });

  it("places the statistics panel above search in the central workspace", () => {
    const props = baseProps();
    render(<DeckBuildingScreen {...props} />);

    const stats = screen.getByTestId("deck-stats-section");
    const search = screen.getByTestId("card-search-input");

    expect(stats.closest(".deck-workspace")).toContainElement(search);
    expect(stats.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("scales cost chart bars relative to the most populated bucket", () => {
    const props = baseProps();
    const viewModel = {
      ...props.viewModel,
      stats: {
        ...props.viewModel.stats,
        totalCards: 7,
        costBuckets: [
          { label: "1以下", count: 2 },
          { label: "2", count: 4 },
          { label: "3", count: 0 },
          { label: "4", count: 1 },
          { label: "5", count: 0 },
          { label: "6", count: 0 },
          { label: "7", count: 0 },
          { label: "8以上", count: 0 }
        ]
      }
    };

    render(<DeckBuildingScreen {...props} viewModel={viewModel} />);

    expect(screen.getByTestId("deck-cost-chart-bar-2")).toHaveStyle({ height: "100%" });
    expect(screen.getByTestId("deck-cost-chart-bar-1以下")).toHaveStyle({ height: "50%" });
    expect(screen.getByTestId("deck-cost-chart-bar-3")).toHaveStyle({ height: "0%" });
  });

  it("shows sorted deck contents with card artwork and the eight-bucket cost chart", () => {
    const props = baseProps();
    const selectedCards = validCatalogSnapshotFixture.cards.slice(0, 3);
    const viewModel = projectDeckBuildingViewModel({
      catalog: validCatalogSnapshotFixture,
      draft: {
        ...props.viewModel.draft,
        cards: selectedCards.map((card, index) => ({ cardId: card.id, count: index + 1 }))
      },
      savedDecks: []
    });

    render(<DeckBuildingScreen {...props} viewModel={viewModel} />);

    const displayedCardIds = screen.getAllByTestId(/deck-contents-row-/).map((row) =>
      row.getAttribute("data-testid")?.replace("deck-contents-row-", "")
    );
    expect(displayedCardIds).toEqual(viewModel.deckContents.map((row) => row.card.id));

    for (const row of viewModel.deckContents) {
      const contentRow = screen.getByTestId(`deck-contents-row-${row.card.id}`);
      expect(within(contentRow).getByTestId(`deck-card-image-${row.card.id}`)).toBeInTheDocument();
      expect(contentRow).toHaveTextContent(localizeCardPresentation(row.card, "ja").name);
    }

    const chart = screen.getByTestId("deck-cost-chart");
    expect(chart).toHaveAccessibleName(
      viewModel.stats.costBuckets
        .map((bucket) => `コスト ${bucket.label}: ${bucket.count}`)
        .join(", ")
    );
    expect(screen.getAllByTestId(/deck-cost-chart-bar-/)).toHaveLength(8);
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
    const fallbacks = screen.getAllByTestId(
      `deck-card-image-fallback-${firstCard.id}`
    );
    const japaneseCard = localizeCardPresentation(firstCard, "ja");
    expect(fallbacks.length).toBeGreaterThan(0);
    expect(fallbacks[0]).toHaveTextContent(japaneseCard.name);
    expect(fallbacks[0]).toHaveTextContent(japaneseCard.type);
    expect(fallbacks[0]).toHaveTextContent(japaneseCard.attribute);
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
