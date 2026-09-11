import "@testing-library/jest-dom/vitest";
import { BattlePreparationScreen } from "@ankake/ui";
import { fireEvent, render, screen } from "@testing-library/react";

const deckOptions = [
  {
    deckId: "deck-1",
    name: "Ready Deck",
    cardCount: 40,
    battleReady: true,
    updatedAt: "2026-07-25T00:00:00.000Z"
  },
  {
    deckId: "deck-2",
    name: "Draft Deck",
    cardCount: 12,
    battleReady: false,
    updatedAt: "2026-07-25T00:00:00.000Z"
  }
];

describe("battle preparation screen", () => {
  it("renders deck selectors and starts only when allowed", () => {
    const onStartBattle = vi.fn();

    render(
      <BattlePreparationScreen
        viewModel={{
          deckOptions,
          playerDeckId: "deck-1",
          cpuDeckId: "deck-1",
          firstPlayerMode: "random",
          loading: false
        }}
        onReturnToMenu={vi.fn()}
        onSelectPlayerDeck={vi.fn()}
        onSelectCpuDeck={vi.fn()}
        onFirstPlayerModeChange={vi.fn()}
        onStartBattle={onStartBattle}
      />
    );

    fireEvent.click(screen.getByTestId("battle-prep-start-button"));

    expect(screen.getByTestId("battle-preparation-screen")).toBeInTheDocument();
    expect(onStartBattle).toHaveBeenCalledTimes(1);
  });

  it("shows disabled start reasons", () => {
    render(
      <BattlePreparationScreen
        viewModel={{
          deckOptions: [],
          firstPlayerMode: "random",
          loading: false
        }}
        startDisabledReason="Create at least one battle-ready 40-card deck first."
        onReturnToMenu={vi.fn()}
        onSelectPlayerDeck={vi.fn()}
        onSelectCpuDeck={vi.fn()}
        onFirstPlayerModeChange={vi.fn()}
        onStartBattle={vi.fn()}
      />
    );

    expect(screen.getByTestId("battle-prep-start-button")).toBeDisabled();
    expect(screen.getByTestId("battle-prep-error")).toHaveTextContent("battle-ready");
  });
});
