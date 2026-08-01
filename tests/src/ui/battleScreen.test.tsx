import "@testing-library/jest-dom/vitest";
import {
  coordinateKey,
  projectPublicBattleView,
  type BattleCardInstance,
  type BattleLogEntry,
  type BattleState
} from "@ankake/domain";
import {
  BattleScreen,
  getNextBoardFocusKey,
  type BoardFocusDirection
} from "@ankake/ui";
import {
  act,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react";
import fc from "fast-check";
import {
  battleStateArbitrary,
  canonicalBoardCoordinateArbitrary
} from "../generators/battleGenerators";

const LOG_ENTRIES: readonly BattleLogEntry[] = [
  {
    sequence: 1,
    message: "Player drew a card.",
    type: "card.drawn",
    side: "player"
  }
];

describe("battle screen", () => {
  it("renders the sparse board, five bases, public resources, and no visible coordinates", () => {
    const state = createBattleScreenState();
    const viewModel = projectPublicBattleView(state);
    const { container } = renderBattleScreen(viewModel);

    expect(screen.getAllByRole("gridcell")).toHaveLength(75);
    expect(screen.queryByTestId("battle-square-1-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("battle-square-3-1")).toHaveStyle({
      gridColumn: "3",
      gridRow: "1"
    });
    expect(screen.getByTestId("battle-square-6-1")).toHaveTextContent("CPU Base");
    expect(screen.getByTestId("battle-square-6-9")).toHaveTextContent("Player Base");
    expect(screen.getByTestId("battle-square-2-5")).toHaveTextContent("Neutral Base");
    expect(screen.getByTestId("battle-square-6-5")).toHaveTextContent("Neutral Base");
    expect(screen.getByTestId("battle-square-10-5")).toHaveTextContent("Neutral Base");
    expect(screen.getByTestId("battle-player-pp")).toHaveTextContent("PP: 10/10");
    expect(screen.getByTestId("battle-opponent-info-panel")).toHaveTextContent("Hand: 5");
    expect(screen.getByTestId("battle-log-panel")).toHaveTextContent("Player drew a card.");

    for (const square of container.querySelectorAll<HTMLElement>(".battle-square")) {
      expect(square.textContent).not.toMatch(/^\s*\d+,\d+/);
    }
  });

  it("skips absent coordinates during roving keyboard focus", () => {
    const viewModel = projectPublicBattleView(createBattleScreenState());
    renderBattleScreen(viewModel);

    const rowTwoColumnThree = screen.getByTestId("battle-square-3-2");
    act(() => rowTwoColumnThree.focus());
    fireEvent.keyDown(rowTwoColumnThree, { key: "ArrowRight" });

    expect(screen.getByTestId("battle-square-5-2")).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId("battle-square-5-2"), {
      key: "ArrowLeft"
    });
    expect(rowTwoColumnThree).toHaveFocus();

    const rowOneColumnThree = screen.getByTestId("battle-square-3-1");
    act(() => rowOneColumnThree.focus());
    fireEvent.keyDown(rowOneColumnThree, { key: "ArrowLeft" });
    expect(rowOneColumnThree).toHaveFocus();
  });

  it("renders nine addressable hand cards, deferred spells, and artwork fallbacks", () => {
    const state = createBattleScreenState();
    const viewModel = projectPublicBattleView(state);
    const { container } = renderBattleScreen(viewModel);

    expect(
      container.querySelectorAll('[data-testid^="battle-hand-card-"]')
    ).toHaveLength(9);
    expect(screen.getByTestId("battle-player-hand-count")).toHaveTextContent("9 cards");

    const spell = viewModel.playerHand.find((card) => card.type === "spell");
    if (!spell) {
      throw new Error("Expected a spell fixture.");
    }
    const spellButton = screen.getByTestId(`battle-hand-card-${spell.instanceId}`);
    expect(spellButton).toHaveAttribute("aria-disabled", "true");
    expect(spellButton).toHaveTextContent("Spell effects are planned for a later cycle.");

    const firstCard = viewModel.playerHand[0];
    const firstCardButton = screen.getByTestId(
      `battle-hand-card-${firstCard.instanceId}`
    );
    const image = within(firstCardButton).getByTestId(
      `battle-card-artwork-${firstCard.catalogCardId}`
    );
    fireEvent.error(image);
    expect(
      within(firstCardButton).getByTestId(
        `battle-card-artwork-fallback-${firstCard.catalogCardId}`
      )
    ).toHaveTextContent(firstCard.name);

    expect(
      container.querySelectorAll('[data-testid^="battle-board-card-"]')
    ).toHaveLength(1);

    const occupiedSquare = viewModel.boardSquares.find(
      (square) => square.occupant
    );
    if (!occupiedSquare?.occupant) {
      throw new Error("Expected an occupied board square fixture.");
    }
    const boardCard = screen.getByTestId(
      `battle-board-card-${occupiedSquare.occupant.instanceId}`
    );
    expect(boardCard).toHaveTextContent(
      `ATK ${occupiedSquare.occupant.currentAttack}`
    );
    expect(boardCard).toHaveTextContent(
      `HP ${occupiedSquare.occupant.currentHp}`
    );
    expect(boardCard).not.toHaveTextContent(occupiedSquare.occupant.name);
    expect(boardCard).not.toHaveTextContent(occupiedSquare.occupant.ownerLabel);
    expect(boardCard.querySelector(".battle-card__name")).toBeNull();
  });

  it("keeps only explicit phase ending and preserves CPU and result presentation", () => {
    const state = createBattleScreenState();
    const viewModel = projectPublicBattleView(state);
    const onEndPlayPhase = vi.fn();
    const { rerender } = renderBattleScreen(viewModel, {
      cpuStatus: "thinking",
      onEndPlayPhase
    });

    expect(screen.queryByTestId("battle-action-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("battle-command-confirm-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("battle-command-cancel-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("battle-cpu-status-overlay")).toHaveTextContent("CPU thinking");

    const endButton = screen.getByTestId("battle-end-play-phase-button");
    expect(endButton).toBeEnabled();
    fireEvent.click(endButton);
    expect(onEndPlayPhase).toHaveBeenCalledTimes(1);

    const terminalView = projectPublicBattleView({
      ...state,
      phase: "terminal",
      terminalResult: {
        winner: "player",
        loser: "cpu",
        reason: "base-destroyed",
        turnNumber: 4,
        elapsedSeconds: 20,
        finalEventSequence: 12
      }
    });

    rerender(
      <BattleScreen
        viewModel={terminalView}
        logEntries={LOG_ENTRIES}
        cpuStatus="completed"
        onReturnToPreparation={vi.fn()}
        onReturnToMenu={vi.fn()}
        onEndPlayPhase={onEndPlayPhase}
        onRematch={vi.fn()}
        onQuitBattle={vi.fn()}
      />
    );

    expect(screen.getByTestId("battle-result-overlay")).toHaveTextContent("Victory");
    expect(screen.getByTestId("battle-end-play-phase-button")).toBeDisabled();
  });

  it("keeps directional focus results inside the projected topology", () => {
    const squares = projectPublicBattleView(createBattleScreenState()).boardSquares;
    const directions: readonly BoardFocusDirection[] = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown"
    ];
    const squareKeys = new Set(squares.map((square) => square.key));

    fc.assert(
      fc.property(
        canonicalBoardCoordinateArbitrary,
        fc.constantFrom(...directions),
        (coordinate, direction) => {
          const currentKey = coordinateKey(coordinate);
          const result = getNextBoardFocusKey(squares, currentKey, direction);

          expect(squareKeys.has(result)).toBe(true);
        }
      ),
      { numRuns: 60 }
    );
  });
});

function renderBattleScreen(
  viewModel: ReturnType<typeof projectPublicBattleView>,
  overrides: {
    readonly cpuStatus?: "idle" | "thinking" | "executing" | "completed" | "limit-reached";
    readonly onEndPlayPhase?: () => void;
  } = {}
) {
  return render(
    <BattleScreen
      viewModel={viewModel}
      logEntries={LOG_ENTRIES}
      cpuStatus={overrides.cpuStatus ?? "idle"}
      onReturnToPreparation={vi.fn()}
      onReturnToMenu={vi.fn()}
      onEndPlayPhase={overrides.onEndPlayPhase ?? vi.fn()}
      onRematch={vi.fn()}
      onQuitBattle={vi.fn()}
    />
  );
}

function createBattleScreenState(): BattleState {
  const sampled = fc.sample(battleStateArbitrary, {
    numRuns: 1,
    seed: 3003
  })[0];
  const playerIds = Object.values(sampled.cardInstances)
    .filter((card) => card.ownerSide === "player")
    .map((card) => card.instanceId);
  const handIds = playerIds.slice(0, 9);
  const boardId = playerIds[9] as string;
  const nextInstances: Record<string, BattleCardInstance> = {
    ...sampled.cardInstances
  };

  for (const [index, instanceId] of handIds.entries()) {
    const card = nextInstances[instanceId] as BattleCardInstance;
    nextInstances[instanceId] = {
      ...card,
      type: index === 0 ? "spell" : card.type,
      zone: "hand",
      position: undefined,
      ...(index === 0
        ? {
            attack: undefined,
            currentAttack: undefined,
            health: undefined,
            currentHp: undefined,
            maxHp: undefined
          }
        : {})
    };
  }

  const boardCard = nextInstances[boardId] as BattleCardInstance;
  nextInstances[boardId] = {
    ...boardCard,
    type: "creature",
    zone: "board",
    position: { column: 5, row: 8 },
    attack: boardCard.attack ?? 3,
    currentAttack: boardCard.currentAttack ?? boardCard.attack ?? 3,
    health: boardCard.health ?? 4,
    currentHp: boardCard.currentHp ?? boardCard.health ?? 4,
    maxHp: boardCard.maxHp ?? boardCard.health ?? 4,
    summonedThisTurn: true,
    movedThisTurn: false
  };

  return {
    ...sampled,
    phase: "play",
    activeSide: "player",
    terminalResult: undefined,
    players: {
      ...sampled.players,
      player: {
        ...sampled.players.player,
        handZone: handIds,
        deckZone: sampled.players.player.deckZone.filter(
          (instanceId) => !handIds.includes(instanceId) && instanceId !== boardId
        ),
        currentPp: 10,
        maxPp: 10
      }
    },
    board: {
      squares: sampled.board.squares.map((square) =>
        square.coordinate.column === 5 && square.coordinate.row === 8
          ? { ...square, occupantId: boardId }
          : square
      )
    },
    cardInstances: nextInstances
  };
}
