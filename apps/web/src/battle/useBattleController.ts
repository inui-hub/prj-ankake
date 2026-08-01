import {
  projectPublicBattleView,
  type BattleCommand,
  type BattleLogEntry,
  type BoardCoordinate,
  type FirstPlayerMode,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import type { DeckRepository } from "@ankake/persistence";
import { useEffect, useMemo, useState } from "react";
import { createConsoleBattleDiagnostics } from "./battleDiagnostics";
import {
  IDLE_BATTLE_INTERACTION,
  cancelBattleInteraction,
  guardEndPlayPhase,
  isBattleInteractionPending,
  prepareMovementConfirmation,
  prepareSummonConfirmation,
  projectBattleInteractionView,
  recoverMovementInteraction,
  recoverSummonInteraction,
  selectMovementCreature,
  selectMovementStep,
  selectSummonDestination,
  selectSummonHandCard,
  undoMovementStep,
  type BattleInteractionState,
  type BattleInteractionView
} from "./battleInteraction";
import {
  attemptRuntimeCommand,
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
      readonly interaction: BattleInteractionView;
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
  readonly selectHandCard: (instanceId: string) => void;
  readonly selectBoardCreature: (instanceId: string) => void;
  readonly selectBoardSquare: (coordinate: BoardCoordinate) => void;
  readonly undoInteraction: () => void;
  readonly confirmInteraction: () => Promise<void>;
  readonly cancelInteraction: () => void;
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
  const [interaction, setInteraction] = useState<BattleInteractionState>(
    IDLE_BATTLE_INTERACTION
  );
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

  useEffect(() => {
    if (!isBattleInteractionPending(interaction)) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setInteraction(cancelBattleInteraction());
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [interaction]);

  useEffect(() => {
    if (
      !session ||
      session.state.activeSide === "cpu" ||
      session.state.phase === "terminal" ||
      session.state.terminalResult
    ) {
      setInteraction(IDLE_BATTLE_INTERACTION);
    }
  }, [session]);

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
    setInteraction(IDLE_BATTLE_INTERACTION);
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

    if (isBattleInteractionPending(interaction)) {
      setInteraction(guardEndPlayPhase(interaction));
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
      if (nextSession.state.phase === "terminal" || nextSession.state.terminalResult) {
        setInteraction(IDLE_BATTLE_INTERACTION);
      }
      setCpuStatus("idle");
      return;
    }

    setInteraction(IDLE_BATTLE_INTERACTION);
    setCpuStatus("thinking");
    await yieldToBrowser();
    setCpuStatus("executing");
    const result = await executeCpuTurn(nextSession, diagnostics, yieldToBrowser);
    setSession(result.session);
    setCpuStatus(result.stopReason === "processing-limit" ? "limit-reached" : "completed");
  }

  async function rematch(): Promise<void> {
    setInteraction(IDLE_BATTLE_INTERACTION);
    setSession(undefined);
    await startSelectedBattle();
  }

  function quitBattle(): void {
    setInteraction(IDLE_BATTLE_INTERACTION);
    setSession(undefined);
  }

  function selectHandCard(instanceId: string): void {
    if (!session) {
      return;
    }

    setInteraction((current) =>
      selectSummonHandCard(current, session.state, instanceId)
    );
  }

  function selectBoardSquare(coordinate: BoardCoordinate): void {
    if (!session) {
      return;
    }

    setInteraction((current) =>
      current.kind === "selecting-move"
        ? selectMovementStep(current, session.state, coordinate)
        : selectSummonDestination(current, coordinate)
    );
  }

  function selectBoardCreature(instanceId: string): void {
    if (!session) {
      return;
    }

    setInteraction((current) =>
      selectMovementCreature(current, session.state, instanceId)
    );
  }

  function undoInteraction(): void {
    if (!session) {
      return;
    }

    setInteraction((current) => undoMovementStep(current, session.state));
  }

  async function confirmInteraction(): Promise<void> {
    if (!session) {
      return;
    }

    const isMovement = interaction.kind === "selecting-move";
    const preparation = isMovement
      ? prepareMovementConfirmation(interaction, session.state)
      : prepareSummonConfirmation(interaction, session.state);
    if (!preparation.ok) {
      setInteraction(preparation.interaction);
      return;
    }

    const submission = attemptRuntimeCommand(
      session,
      preparation.command,
      diagnostics
    );
    if (!submission.ok) {
      setInteraction(
        isMovement
          ? recoverMovementInteraction(
              submission.session.state,
              interaction,
              submission.issues
            )
          : recoverSummonInteraction(
              submission.session.state,
              interaction,
              submission.issues
            )
      );
      return;
    }

    setInteraction(IDLE_BATTLE_INTERACTION);
    setSession(submission.session);
    await runCpuIfNeeded(submission.session);
  }

  function cancelInteraction(): void {
    setInteraction(cancelBattleInteraction());
  }

  const viewModel: BattleRouteViewModel = session
    ? (() => {
        const publicView = projectPublicBattleView(session.state);
        return {
          kind: "battle",
          publicView,
          interaction: projectBattleInteractionView(interaction, publicView),
          logEntries: session.log.entries,
          cpuStatus
        };
      })()
    : {
        kind: "preparation",
        preparation,
        startDisabledReason: getBattleStartDisabledReason(preparation)
      };

  return {
    viewModel,
    actions: {
      returnToMenu: () => {
        setInteraction(IDLE_BATTLE_INTERACTION);
        input.onReturnToMenu();
      },
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
      selectHandCard,
      selectBoardCreature,
      selectBoardSquare,
      undoInteraction,
      confirmInteraction,
      cancelInteraction,
      endPlayPhase,
      rematch,
      quitBattle
    }
  };
}
