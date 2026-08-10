import "@testing-library/jest-dom/vitest";
import {
  coordinateKey,
  projectPublicBattleView,
  updateBattleBase,
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
  renderHook,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import fc from "fast-check";
import { useState } from "react";
import type { DeckRepository } from "@ankake/persistence";
import {
  IDLE_BATTLE_INTERACTION,
  cancelBattleInteraction,
  projectBattleInteractionFromState,
  selectMovementCreature,
  selectMovementStep,
  selectSummonDestination,
  selectSummonHandCard,
  undoMovementStep,
  type BattleInteractionState
} from "../../../apps/web/src/battle/battleInteraction";
import { useBattleController } from "../../../apps/web/src/battle/useBattleController";
import {
  battleStateArbitrary,
  canonicalBoardCoordinateArbitrary
} from "../generators/battleGenerators";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";

const battleSetupMocks = vi.hoisted(() => ({
  loadBattlePreparation: vi.fn(),
  startBattle: vi.fn()
}));

vi.mock("../../../apps/web/src/battle/battleSetupService", () => ({
  loadBattlePreparation: battleSetupMocks.loadBattlePreparation,
  startBattle: battleSetupMocks.startBattle,
  getBattleStartDisabledReason: (state: {
    readonly loading: boolean;
    readonly playerDeckId?: string;
    readonly cpuDeckId?: string;
  }) =>
    state.loading || !state.playerDeckId || !state.cpuDeckId
      ? "Battle setup is not ready."
      : undefined
}));

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
    const initialState = createBattleScreenState();
    const state: BattleState = {
      ...initialState,
      bases: updateBattleBase(
        updateBattleBase(initialState.bases, "player-base", (base) => ({
          ...base,
          currentHp: 13
        })),
        "cpu-base",
        (base) => ({ ...base, currentHp: 7 })
      )
    };
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
    expect(screen.getByTestId("battle-base-summary")).toHaveTextContent("CPU Base");
    expect(screen.getByTestId("battle-base-summary-cpu-base")).toHaveTextContent("HP 7/20");
    expect(screen.getByTestId("battle-base-summary-player-base")).toHaveTextContent("HP 13/20");
    expect(screen.getByTestId("battle-base-summary-neutral-left")).toHaveTextContent("Unclaimed");
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

  it("renders nine addressable hand cards, actionable spells, and artwork fallbacks", () => {
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
    expect(spell.isActionable).toBe(true);
    expect(spellButton).toHaveAttribute("aria-disabled", "false");
    expect(spellButton).not.toHaveTextContent("Spell effects are planned for a later cycle.");

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
    expect(screen.getByTestId("battle-result-reason")).toHaveTextContent("Enemy base destroyed");
    expect(screen.getByTestId("battle-end-play-phase-button")).toBeDisabled();
    expect(screen.getByTestId("battle-square-3-1")).toBeDisabled();
    expect(
      screen.getByTestId(
        `battle-hand-card-${terminalView.playerHand[0]!.instanceId}`
      )
    ).toBeDisabled();
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

  it("renders selection, direct switching, exact candidates, destination, and cancellation", () => {
    const state = createBattleScreenState();
    const viewModel = projectPublicBattleView(state);
    const creatures = viewModel.playerHand.filter(
      (card) => card.type === "creature" && card.isActionable
    );
    const spell = viewModel.playerHand.find((card) => card.type === "spell");

    if (creatures.length < 2 || !spell) {
      throw new Error("Expected two actionable creatures and one spell.");
    }

    render(<BattleScreenInteractionHarness state={state} />);

    const firstCard = screen.getByTestId(`battle-hand-card-${creatures[0].instanceId}`);
    const secondCard = screen.getByTestId(`battle-hand-card-${creatures[1].instanceId}`);
    fireEvent.click(firstCard);

    expect(firstCard).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelectorAll(".battle-square--candidate")).toHaveLength(6);
    expect(screen.getByTestId("battle-summon-confirm-button")).toBeDisabled();
    expect(screen.getByTestId("battle-summon-cancel-button")).toBeEnabled();
    expect(screen.getByTestId("battle-end-play-phase-button")).toBeDisabled();

    fireEvent.click(screen.getByTestId("battle-square-5-8"));
    expect(document.querySelectorAll(".battle-square--selected")).toHaveLength(0);

    fireEvent.click(screen.getByTestId("battle-square-3-9"));
    expect(screen.getByTestId("battle-square-3-9")).toHaveClass(
      "battle-square--selected"
    );
    expect(screen.getByTestId("battle-summon-confirm-button")).toBeEnabled();

    fireEvent.click(secondCard);
    expect(secondCard).toHaveAttribute("aria-pressed", "true");
    expect(firstCard).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelectorAll(".battle-square--selected")).toHaveLength(0);
    expect(screen.getByTestId("battle-summon-confirm-button")).toBeDisabled();

    fireEvent.click(secondCard);
    expect(screen.queryByTestId("battle-summon-confirm-button")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".battle-square--candidate")).toHaveLength(0);
    expect(screen.getByTestId("battle-end-play-phase-button")).toBeEnabled();

    fireEvent.click(firstCard);
    fireEvent.click(screen.getByTestId("battle-summon-cancel-button"));
    expect(screen.queryByTestId("battle-summon-cancel-button")).not.toBeInTheDocument();
    expect(screen.getByTestId(`battle-hand-card-${spell.instanceId}`)).toHaveAttribute("aria-disabled", "false");
  });

  it("renders an ordered reversible movement draft with exactly one provisional creature", () => {
    const state = createBattleScreenState();
    const viewModel = projectPublicBattleView(state);
    const boardCreature = viewModel.boardSquares.find((square) => square.occupant)
      ?.occupant;
    const handCreature = viewModel.playerHand.find(
      (card) => card.type === "creature" && card.isActionable
    );
    if (!boardCreature || !handCreature) {
      throw new Error("Expected actionable board and hand creatures.");
    }

    const { container } = render(<BattleScreenInteractionHarness state={state} />);
    const boardCardTestId = `battle-board-card-${boardCreature.instanceId}`;

    fireEvent.click(screen.getByTestId(`battle-hand-card-${handCreature.instanceId}`));
    expect(screen.getByTestId("battle-summon-cancel-button")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(boardCardTestId));

    expect(screen.getByTestId("battle-move-confirm-button")).toBeDisabled();
    expect(screen.getByTestId("battle-move-undo-button")).toBeDisabled();
    expect(screen.getByTestId("battle-move-cancel-button")).toBeEnabled();
    expect(screen.getByTestId("battle-end-play-phase-button")).toBeDisabled();
    expect(container.querySelectorAll(".battle-square--candidate")).toHaveLength(8);
    expect(screen.getByTestId("battle-movement-budget")).toHaveTextContent(
      "Movement 0 / 3"
    );

    fireEvent.click(screen.getByTestId("battle-square-9-9"));
    expect(container.querySelectorAll(".battle-square--candidate")).toHaveLength(8);

    fireEvent.click(screen.getByTestId("battle-square-5-5"));
    expect(screen.getByTestId("battle-square-4-5")).not.toContainElement(
      screen.getByTestId(boardCardTestId)
    );
    expect(screen.getByTestId("battle-square-5-5")).toContainElement(
      screen.getByTestId(boardCardTestId)
    );
    expect(container.querySelectorAll(`[data-testid="${boardCardTestId}"]`)).toHaveLength(1);
    expect(screen.getAllByTestId("battle-movement-origin-marker")).toHaveLength(1);
    expect(screen.getByTestId("battle-movement-step-1")).toHaveTextContent("1");
    expect(screen.getByTestId("battle-move-confirm-button")).toBeEnabled();
    expect(screen.getByTestId("battle-move-undo-button")).toBeEnabled();

    fireEvent.click(screen.getByTestId("battle-square-4-5"));
    expect(screen.getByTestId("battle-square-4-5")).toContainElement(
      screen.getByTestId(boardCardTestId)
    );
    expect(screen.getByTestId("battle-movement-step-2")).toHaveTextContent("2");

    fireEvent.click(screen.getByTestId("battle-square-5-5"));
    expect(screen.getByTestId("battle-square-5-5")).toContainElement(
      screen.getByTestId(boardCardTestId)
    );
    expect(screen.getByTestId("battle-movement-step-3")).toHaveTextContent("3");
    expect(screen.getByTestId("battle-movement-budget")).toHaveTextContent(
      "Movement 3 / 3"
    );
    expect(container.querySelectorAll(".battle-square--candidate")).toHaveLength(0);

    fireEvent.click(screen.getByTestId("battle-move-undo-button"));
    expect(screen.queryByTestId("battle-movement-step-3")).not.toBeInTheDocument();
    expect(screen.getByTestId("battle-square-4-5")).toContainElement(
      screen.getByTestId(boardCardTestId)
    );
    expect(screen.getByTestId("battle-movement-budget")).toHaveTextContent(
      "Movement 2 / 3"
    );

    fireEvent.click(screen.getByTestId("battle-move-cancel-button"));
    expect(screen.queryByTestId("battle-move-cancel-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("battle-square-4-5")).toContainElement(
      screen.getByTestId(boardCardTestId)
    );
    expect(container.querySelectorAll(".battle-square--candidate")).toHaveLength(0);

    fireEvent.click(screen.getByTestId(boardCardTestId));
    fireEvent.click(screen.getByTestId(boardCardTestId));
    expect(screen.queryByTestId("battle-move-cancel-button")).not.toBeInTheDocument();
  });

  it("cancels a controller-owned pending summon on Escape and cleans up the listener", async () => {
    const state = createBattleScreenState();
    battleSetupMocks.loadBattlePreparation.mockResolvedValue({
      deckOptions: [
        {
          deckId: "deck-controller",
          name: "Controller Deck",
          cardCount: 40,
          battleReady: true,
          updatedAt: "2026-08-01T00:00:00.000Z"
        }
      ],
      playerDeckId: "deck-controller",
      cpuDeckId: "deck-controller",
      firstPlayerMode: "player-first",
      loading: false
    });
    battleSetupMocks.startBattle.mockResolvedValue({ ok: true, state, events: [] });
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() =>
      useBattleController({
        catalog: validCatalogSnapshotFixture,
        repository: {} as DeckRepository,
        onReturnToMenu: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.viewModel.kind).toBe("preparation");
      if (result.current.viewModel.kind === "preparation") {
        expect(result.current.viewModel.preparation.loading).toBe(false);
      }
    });
    await act(async () => {
      await result.current.actions.startBattle();
    });

    if (result.current.viewModel.kind !== "battle") {
      throw new Error("Expected a started battle controller.");
    }
    const spell = result.current.viewModel.publicView.playerHand.find(
      (card) => card.type === "spell" && card.isActionable
    );
    if (!spell) {
      throw new Error("Expected an actionable spell.");
    }
    if (spell.attribute === "unknown") {
      throw new Error("Expected the spell fixture to have an attribute.");
    }
    const spellAttribute = spell.attribute;
    const resonanceBefore = result.current.viewModel.publicView.playerResonance;

    act(() => result.current.actions.selectHandCard(spell.instanceId));
    await waitFor(() => {
      if (result.current.viewModel.kind !== "battle") {
        throw new Error("Expected an active battle.");
      }
      expect(result.current.viewModel.publicView.playerHand).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ instanceId: spell.instanceId })])
      );
    });
    if (result.current.viewModel.kind === "battle") {
      const resonanceAfter = result.current.viewModel.publicView.playerResonance;
      const gain = Math.min(3, spell.currentCost ?? 0);
      for (const lane of ["left", "center", "right"] as const) {
        expect(resonanceAfter[lane][spellAttribute]).toBe(
          resonanceBefore[lane][spellAttribute] + gain
        );
      }
      expect(result.current.viewModel.interaction.kind).toBe("idle");
      expect(
        result.current.viewModel.logEntries.slice(-4).map((entry) => entry.type)
      ).toEqual(["spell.resolved", "resonance.changed", "resonance.changed", "resonance.changed"]);
    }

    const creature = result.current.viewModel.publicView.playerHand.find(
      (card) => card.type === "creature" && card.isActionable
    );
    if (!creature) {
      throw new Error("Expected an actionable creature.");
    }

    act(() => result.current.actions.selectHandCard(creature.instanceId));
    expect(result.current.viewModel.kind).toBe("battle");
    if (result.current.viewModel.kind === "battle") {
      expect(result.current.viewModel.interaction.kind).toBe("selecting-summon");
    }

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      if (result.current.viewModel.kind === "battle") {
        expect(result.current.viewModel.interaction.kind).toBe("idle");
      }
    });
    expect(removeListener).toHaveBeenCalledWith("keydown", expect.any(Function));

    unmount();
    removeListener.mockRestore();
  });

  it("guards phase end, cancels movement on Escape, and confirms through the controller", async () => {
    const state = createBattleScreenState();
    battleSetupMocks.loadBattlePreparation.mockResolvedValue({
      deckOptions: [
        {
          deckId: "deck-movement-controller",
          name: "Movement Controller Deck",
          cardCount: 40,
          battleReady: true,
          updatedAt: "2026-08-01T00:00:00.000Z"
        }
      ],
      playerDeckId: "deck-movement-controller",
      cpuDeckId: "deck-movement-controller",
      firstPlayerMode: "player-first",
      loading: false
    });
    battleSetupMocks.startBattle.mockResolvedValue({ ok: true, state, events: [] });
    const { result } = renderHook(() =>
      useBattleController({
        catalog: validCatalogSnapshotFixture,
        repository: {} as DeckRepository,
        onReturnToMenu: vi.fn()
      })
    );

    await waitFor(() => {
      if (result.current.viewModel.kind === "preparation") {
        expect(result.current.viewModel.preparation.loading).toBe(false);
      }
    });
    await act(async () => {
      await result.current.actions.startBattle();
    });
    if (result.current.viewModel.kind !== "battle") {
      throw new Error("Expected a started battle controller.");
    }
    const creature = result.current.viewModel.publicView.boardSquares.find(
      (square) => square.occupant?.isActionable
    )?.occupant;
    if (!creature) {
      throw new Error("Expected an actionable board creature.");
    }

    act(() => result.current.actions.selectBoardCreature(creature.instanceId));
    await act(async () => {
      await result.current.actions.endPlayPhase();
    });
    if (result.current.viewModel.kind === "battle") {
      expect(result.current.viewModel.interaction).toMatchObject({
        kind: "selecting-move",
        issue: "Confirm or cancel the pending action before ending the play phase."
      });
    }

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      if (result.current.viewModel.kind === "battle") {
        expect(result.current.viewModel.interaction.kind).toBe("idle");
      }
    });

    act(() => result.current.actions.selectBoardCreature(creature.instanceId));
    act(() => result.current.actions.selectBoardSquare({ column: 5, row: 5 }));
    await act(async () => {
      await result.current.actions.confirmInteraction();
    });

    if (result.current.viewModel.kind === "battle") {
      expect(result.current.viewModel.interaction.kind).toBe("idle");
      expect(
        result.current.viewModel.publicView.boardSquares.find(
          (square) => square.key === "5:5"
        )?.occupant
      ).toMatchObject({ instanceId: creature.instanceId, movedThisTurn: true });
    }
  });
});

function BattleScreenInteractionHarness({ state }: { readonly state: BattleState }) {
  const [interaction, setInteraction] = useState<BattleInteractionState>(
    IDLE_BATTLE_INTERACTION
  );

  return (
    <BattleScreen
      viewModel={projectPublicBattleView(state)}
      interaction={projectBattleInteractionFromState(interaction, state)}
      logEntries={LOG_ENTRIES}
      cpuStatus="idle"
      onReturnToPreparation={vi.fn()}
      onReturnToMenu={vi.fn()}
      onEndPlayPhase={vi.fn()}
      onHandCardIntent={(instanceId) => {
        setInteraction((current) =>
          selectSummonHandCard(current, state, instanceId)
        );
      }}
      onBoardSquareIntent={(coordinate) => {
        setInteraction((current) =>
          current.kind === "selecting-move"
            ? selectMovementStep(current, state, coordinate)
            : selectSummonDestination(current, coordinate)
        );
      }}
      onBoardCreatureIntent={(instanceId) => {
        setInteraction((current) =>
          selectMovementCreature(current, state, instanceId)
        );
      }}
      onConfirmInteraction={vi.fn()}
      onCancelInteraction={() => setInteraction(cancelBattleInteraction())}
      onUndoInteraction={() => {
        setInteraction((current) => undoMovementStep(current, state));
      }}
      onRematch={vi.fn()}
      onQuitBattle={vi.fn()}
    />
  );
}

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
      type: index === 0 ? "spell" : "creature",
      zone: "hand",
      position: undefined,
      currentCost: index === 0 ? card.currentCost : Math.min(card.currentCost, 3),
      ...(index === 0
        ? {
            attack: undefined,
            currentAttack: undefined,
            health: undefined,
            currentHp: undefined,
            maxHp: undefined
          }
        : {
            attack: card.attack ?? 3,
            currentAttack: card.currentAttack ?? card.attack ?? 3,
            health: card.health ?? 4,
            currentHp: card.currentHp ?? card.health ?? 4,
            maxHp: card.maxHp ?? card.health ?? 4,
            movement: Math.max(1, card.movement)
          })
    };
  }

  const boardCard = nextInstances[boardId] as BattleCardInstance;
  nextInstances[boardId] = {
    ...boardCard,
    type: "creature",
    zone: "board",
    position: { column: 4, row: 5 },
    attack: boardCard.attack ?? 3,
    currentAttack: boardCard.currentAttack ?? boardCard.attack ?? 3,
    health: boardCard.health ?? 4,
    currentHp: boardCard.currentHp ?? boardCard.health ?? 4,
    maxHp: boardCard.maxHp ?? boardCard.health ?? 4,
    movement: 3,
    summonedThisTurn: false,
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
        square.coordinate.column === 4 && square.coordinate.row === 5
          ? { ...square, occupantId: boardId }
          : square
      )
    },
    cardInstances: nextInstances
  };
}
