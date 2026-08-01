import {
  projectPublicBattleView,
  type BattleCommand,
  type BattleLogEntry,
  type FirstPlayerMode,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import type { DeckRepository } from "@ankake/persistence";
import { useEffect, useMemo, useState } from "react";
import { createConsoleBattleDiagnostics } from "./battleDiagnostics";
import {
  createBattleRuntimeSession,
  executeCpuTurn,
  submitRuntimeCommand,
  type BattleRuntimeSession
} from "./battleRuntimeService";
import {
  getBattleStartDisabledReason,
  loadBattlePreparation,
  startBattle,
  type BattlePreparationState
} from "./battleSetupService";
import { yieldToBrowser } from "./scheduler";

export type BattleRouteViewModel =
  | {
      readonly kind: "preparation";
      readonly preparation: BattlePreparationState;
      readonly startDisabledReason?: string;
    }
  | {
      readonly kind: "battle";
      readonly publicView: ReturnType<typeof projectPublicBattleView>;
      readonly logEntries: readonly BattleLogEntry[];
      readonly cpuStatus: "idle" | "thinking" | "executing" | "completed" | "limit-reached";
    };

export interface BattleControllerActions {
  readonly returnToMenu: () => void;
  readonly selectPlayerDeck: (deckId: string) => void;
  readonly selectCpuDeck: (deckId: string) => void;
  readonly setFirstPlayerMode: (mode: FirstPlayerMode) => void;
  readonly startBattle: () => Promise<void>;
  readonly submitCommand: (command: BattleCommand) => Promise<void>;
  readonly endPlayPhase: () => Promise<void>;
  readonly rematch: () => Promise<void>;
  readonly quitBattle: () => void;
}

export interface BattleController {
  readonly viewModel: BattleRouteViewModel;
  readonly actions: BattleControllerActions;
}

export interface BattleControllerInput {
  readonly catalog: StaticCatalogSnapshot;
  readonly repository: DeckRepository;
  readonly onReturnToMenu: () => void;
}

export function useBattleController(input: BattleControllerInput): BattleController {
  const diagnostics = useMemo(() => createConsoleBattleDiagnostics(), []);
  const [preparation, setPreparation] = useState<BattlePreparationState>({
    deckOptions: [],
    firstPlayerMode: "random",
    loading: true
  });
  const [session, setSession] = useState<BattleRuntimeSession | undefined>();
  const [cpuStatus, setCpuStatus] = useState<BattleRouteViewModel["kind"] extends "battle" ? never : "idle" | "thinking" | "executing" | "completed" | "limit-reached">("idle");

  useEffect(() => {
    let cancelled = false;
    loadBattlePreparation(input.repository).then((next) => {
      if (!cancelled) {
        setPreparation(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [input.repository]);

  async function startSelectedBattle(): Promise<void> {
    const disabledReason = getBattleStartDisabledReason(preparation);
    if (disabledReason || !preparation.playerDeckId || !preparation.cpuDeckId) {
      setPreparation({
        ...preparation,
        error: disabledReason ?? "Select battle decks first."
      });
      return;
    }

    setPreparation({
      ...preparation,
      loading: true,
      error: undefined
    });

    const result = await startBattle({
      repository: input.repository,
      catalog: input.catalog,
      playerDeckId: preparation.playerDeckId,
      cpuDeckId: preparation.cpuDeckId,
      firstPlayerMode: preparation.firstPlayerMode
    });

    if (!result.ok) {
      setPreparation({
        ...preparation,
        loading: false,
        error: result.issues[0]?.message ?? "Battle could not start."
      });
      return;
    }

    diagnostics.seed(result.state.metadata.setup.seed);
    const nextSession = createBattleRuntimeSession(result.state, result.events);
    setSession(nextSession);
    setPreparation({
      ...preparation,
      loading: false
    });
    await runCpuIfNeeded(nextSession);
  }

  async function submitCommand(command: BattleCommand): Promise<void> {
    if (!session) {
      return;
    }

    const nextSession = submitRuntimeCommand(session, command, diagnostics);
    setSession(nextSession);
    await runCpuIfNeeded(nextSession);
  }

  async function endPlayPhase(): Promise<void> {
    if (!session) {
      return;
    }

    await submitCommand({
      type: "endPlayPhase",
      side: session.state.activeSide,
      reason: "manual"
    });
  }

  async function runCpuIfNeeded(nextSession: BattleRuntimeSession): Promise<void> {
    if (nextSession.state.phase !== "play" || nextSession.state.activeSide !== "cpu") {
      setCpuStatus("idle");
      return;
    }

    setCpuStatus("thinking");
    await yieldToBrowser();
    setCpuStatus("executing");
    const result = await executeCpuTurn(nextSession, diagnostics, yieldToBrowser);
    setSession(result.session);
    setCpuStatus(result.stopReason === "processing-limit" ? "limit-reached" : "completed");
  }

  async function rematch(): Promise<void> {
    setSession(undefined);
    await startSelectedBattle();
  }

  function quitBattle(): void {
    setSession(undefined);
  }

  const viewModel: BattleRouteViewModel = session
    ? {
        kind: "battle",
        publicView: projectPublicBattleView(session.state),
        logEntries: session.log.entries,
        cpuStatus
      }
    : {
        kind: "preparation",
        preparation,
        startDisabledReason: getBattleStartDisabledReason(preparation)
      };

  return {
    viewModel,
    actions: {
      returnToMenu: input.onReturnToMenu,
      selectPlayerDeck: (deckId) => {
        setPreparation({
          ...preparation,
          playerDeckId: deckId,
          error: undefined
        });
      },
      selectCpuDeck: (deckId) => {
        setPreparation({
          ...preparation,
          cpuDeckId: deckId,
          error: undefined
        });
      },
      setFirstPlayerMode: (mode) => {
        setPreparation({
          ...preparation,
          firstPlayerMode: mode,
          error: undefined
        });
      },
      startBattle: startSelectedBattle,
      submitCommand,
      endPlayPhase,
      rematch,
      quitBattle
    }
  };
}
