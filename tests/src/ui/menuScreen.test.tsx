import "@testing-library/jest-dom/vitest";
import type { FatalErrorState, MenuViewModel } from "@ankake/domain";
import {
  FatalErrorDialog,
  GlobalLoadingOverlay,
  MenuScreen
} from "@ankake/ui";
import { fireEvent, render, screen } from "@testing-library/react";

const baseViewModel: MenuViewModel = {
  title: "Project Ankake",
  subtitle: "Original digital card game prototype",
  versionText: "Catalog 1.1.0",
  actions: [
    {
      id: "cpu-battle",
      label: "CPU Battle",
      description: "Play a local CPU match after battle rules arrive.",
      routeLabel: "CPU battle",
      enabled: false,
      disabledReason: "Coming in UOW-003.",
      dataTestId: "menu-action-cpu-battle",
      tone: "primary"
    },
    {
      id: "deck-building",
      label: "Deck Building",
      description: "Prepare and tune local decks after deck storage arrives.",
      routeLabel: "Deck building",
      enabled: false,
      disabledReason: "Coming in UOW-002.",
      dataTestId: "menu-action-deck-building",
      tone: "secondary"
    }
  ],
  loadingOverlay: {
    visible: false,
    label: "Loading catalog"
  }
};

const fatalError: FatalErrorState = {
  title: "Application could not start",
  message: "Reload the page after catalog files are fixed.",
  issues: ["cards[0].id: required"],
  canReload: true
};

describe("menu UI", () => {
  it("renders stable menu action test ids and disabled future destinations", () => {
    const onActionSelected = vi.fn();

    render(<MenuScreen viewModel={baseViewModel} onActionSelected={onActionSelected} />);

    expect(screen.getByTestId("menu-action-cpu-battle")).toBeDisabled();
    expect(screen.getByTestId("menu-action-deck-building")).toBeDisabled();
    expect(screen.getByTestId("menu-version-text")).toHaveTextContent("Catalog 1.1.0");
    expect(onActionSelected).not.toHaveBeenCalled();
  });

  it("renders the global loading overlay with a status role", () => {
    render(<GlobalLoadingOverlay overlay={{ visible: true, label: "Loading catalog" }} />);

    expect(screen.getByTestId("global-loading-overlay")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading catalog");
  });

  it("renders fatal startup errors with reload guidance", () => {
    const onReloadRequested = vi.fn();

    render(<FatalErrorDialog error={fatalError} onReloadRequested={onReloadRequested} />);

    expect(screen.getByTestId("fatal-error-dialog")).toHaveAttribute("role", "alertdialog");
    expect(screen.getByText(/Reload the page/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("fatal-error-close-button"));
    expect(onReloadRequested).toHaveBeenCalledTimes(1);
  });

  it("keeps menu actions disabled when a fatal dialog view model is present", () => {
    const fatalViewModel: MenuViewModel = {
      ...baseViewModel,
      fatalErrorDialog: fatalError
    };

    render(<MenuScreen viewModel={fatalViewModel} onActionSelected={vi.fn()} />);

    expect(screen.getByTestId("menu-action-cpu-battle")).toBeDisabled();
    expect(screen.getByTestId("menu-action-deck-building")).toBeDisabled();
  });
});
