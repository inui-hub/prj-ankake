import "@testing-library/jest-dom/vitest";
import {
  GameEngine,
  generateLegalActions,
  projectPublicBattleView
} from "@ankake/domain";
import { BattleScreen } from "@ankake/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { battleStateArbitrary } from "../generators/battleGenerators";
import fc from "fast-check";

describe("battle screen", () => {
  it("renders public battle state without CPU hand identities", () => {
    const state = fc.sample(battleStateArbitrary, { numRuns: 1 })[0];
    const cpuHiddenCardName = state.cardInstances[state.players.cpu.handZone[0]]?.name;
    const viewModel = projectPublicBattleView(state, generateLegalActions(state, state.activeSide));

    render(
      <BattleScreen
        viewModel={viewModel}
        logEntries={[]}
        cpuStatus="idle"
        onReturnToPreparation={vi.fn()}
        onReturnToMenu={vi.fn()}
        onSubmitCommand={vi.fn()}
        onEndPlayPhase={vi.fn()}
        onRematch={vi.fn()}
        onQuitBattle={vi.fn()}
      />
    );

    expect(screen.getByTestId("battle-screen")).toBeInTheDocument();
    expect(screen.getByTestId("battle-opponent-info-panel")).toHaveTextContent("Hand: 5");
    if (cpuHiddenCardName) {
      expect(screen.queryByText(cpuHiddenCardName)).not.toBeInTheDocument();
    }
  });

  it("keeps board squares keyboard reachable with roving focus", () => {
    const state = fc.sample(battleStateArbitrary, { numRuns: 1 })[0];
    const viewModel = projectPublicBattleView(state, generateLegalActions(state, state.activeSide));

    render(
      <BattleScreen
        viewModel={viewModel}
        logEntries={[]}
        cpuStatus="idle"
        onReturnToPreparation={vi.fn()}
        onReturnToMenu={vi.fn()}
        onSubmitCommand={vi.fn()}
        onEndPlayPhase={vi.fn()}
        onRematch={vi.fn()}
        onQuitBattle={vi.fn()}
      />
    );

    const firstSquare = screen.getByTestId("battle-square-1-1");
    firstSquare.focus();
    fireEvent.keyDown(firstSquare, { key: "ArrowRight" });

    expect(screen.getByTestId("battle-square-2-1")).toHaveFocus();
  });

  it("submits legal action buttons", () => {
    const state = fc.sample(battleStateArbitrary, { numRuns: 1 })[0];
    const viewModel = projectPublicBattleView(state, generateLegalActions(state, state.activeSide));
    const onSubmitCommand = vi.fn();

    render(
      <BattleScreen
        viewModel={viewModel}
        logEntries={[]}
        cpuStatus="idle"
        onReturnToPreparation={vi.fn()}
        onReturnToMenu={vi.fn()}
        onSubmitCommand={onSubmitCommand}
        onEndPlayPhase={vi.fn()}
        onRematch={vi.fn()}
        onQuitBattle={vi.fn()}
      />
    );

    const command = viewModel.legalActions[0]?.command;
    if (!command) {
      return;
    }

    const buttonName = viewModel.legalActions[0]?.label ?? "";
    fireEvent.click(screen.getByRole("button", { name: buttonName }));

    expect(onSubmitCommand).toHaveBeenCalledWith(command);
    expect(GameEngine.submitCommand(state, command).ok).toBe(true);
  });
});
