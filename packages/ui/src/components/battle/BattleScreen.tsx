import type {
  BattleLogEntry,
  BoardCoordinate,
  PublicBattleView
} from "@ankake/domain";
import { useEffect, useRef, useState } from "react";
import { BattleBoard } from "./BattleBoard";
import { BattleResultOverlay } from "./BattleDialogs";
import { BattleHand } from "./BattleHand";
import { BattleCardDetailPopover } from "./BattleCardDetailPopover";
import { uiText } from "../../localization";
import {
  BattleInteractionControls,
  type BattleInteractionControlsView
} from "./BattleInteractionControls";
import {
  BattleInfoPanels,
  BattleLogPanel,
  BattleStatusPanel
} from "./BattlePanels";

export interface BattleScreenProps {
  readonly viewModel: PublicBattleView;
  readonly logEntries: readonly BattleLogEntry[];
  readonly cpuStatus: "idle" | "thinking" | "executing" | "completed" | "limit-reached";
  readonly interaction?: BattleInteractionControlsView;
  readonly onReturnToPreparation: () => void;
  readonly onReturnToMenu: () => void;
  readonly onEndPlayPhase: () => void;
  readonly onHandCardIntent?: (instanceId: string) => void;
  readonly onBoardCreatureIntent?: (instanceId: string) => void;
  readonly onBoardSquareIntent?: (coordinate: BoardCoordinate) => void;
  readonly onCancelInteraction?: () => void;
  readonly onUndoInteraction?: () => void;
  readonly onEffectCandidateIntent?: (id: string) => void;
  readonly onRematch: () => void;
  readonly onQuitBattle: () => void;
  readonly locale?: "ja" | "en";
  readonly resonanceIssueCode?: string;
}

export function BattleScreen(props: BattleScreenProps) {
  const interaction = props.interaction ?? createIdleInteraction(props.viewModel);
  const terminal = Boolean(props.viewModel.terminalResult);
  const [detail, setDetail] = useState<DetailState>();
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();

  function closeDetail(): void {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setDetail(undefined);
  }

  function inspect(card: NonNullable<PublicBattleView["boardSquares"][number]["occupant"]>, element: HTMLElement, source: DetailSource): void {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setDetail({ card, element, source, position: calculateDetailPosition(element) });
  }

  function schedulePointerClose(): void {
    if (detail?.source !== "pointer") return;
    leaveTimer.current = setTimeout(closeDetail, 80);
  }

  useEffect(() => {
    const refresh = () => setDetail((current) => current ? { ...current, position: calculateDetailPosition(current.element) } : current);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeDetail(); };
    const outside = (event: PointerEvent) => {
      if (event.pointerType === "touch" && detail && !detail.element.contains(event.target as Node)) closeDetail();
    };
    window.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);
    window.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [detail]);

  return (
    <main className="battle-screen" data-testid="battle-screen">
      <BattleStatusPanel
        viewModel={props.viewModel}
        cpuStatus={props.cpuStatus}
        locale={props.locale}
        onReturnToMenu={props.onReturnToMenu}
        onQuitBattle={props.onQuitBattle}
      />
      <div className="battle-shell">
        <div className="battle-main-column">
          <p className="battle-resonance-status" data-testid="battle-resonance-status" role="status">
            {resonanceIssueMessage(props.locale, props.resonanceIssueCode)}
          </p>
          <BattleBoard
            squares={props.viewModel.boardSquares}
            candidateKeys={interaction.candidateDestinationKeys}
            selectedKey={interaction.selectedDestinationKey}
            selectedCreatureInstanceId={interaction.selectedCreatureInstanceId}
            movementOriginKey={interaction.movementOriginKey}
            movementPathSteps={interaction.movementPathSteps}
            provisionalPositionKey={interaction.provisionalPositionKey}
            effectSelectionMode={interaction.kind === "selecting-effect"}
            interactionDisabled={terminal}
            locale={props.locale}
            onCreatureIntent={terminal ? undefined : props.onBoardCreatureIntent}
            onSquareIntent={terminal ? undefined : props.onBoardSquareIntent}
            onCardInspect={(card, element, source) => card && inspect(card, element, source)}
            onInspectLeave={schedulePointerClose}
            onInspectBlur={() => detail?.source === "focus" && closeDetail()}
          />
          <BattleHand
            cards={props.viewModel.playerHand}
            selectedInstanceId={interaction.selectedHandInstanceId}
            interactionDisabled={terminal}
            onCardIntent={terminal ? undefined : props.onHandCardIntent}
            onCardInspect={inspect}
            onInspectLeave={schedulePointerClose}
            onInspectBlur={() => detail?.source === "focus" && closeDetail()}
            locale={props.locale}
          />
        </div>
        <div className="battle-side-rail">
          <BattleInfoPanels
            viewModel={props.viewModel}
            locale={props.locale}
          />
          <BattleInteractionControls
            interaction={interaction}
            onCancel={props.onCancelInteraction ?? noOperation}
            onUndo={props.onUndoInteraction ?? noOperation}
            onEndPlayPhase={props.onEndPlayPhase}
            onEffectCandidate={props.onEffectCandidateIntent}
            interactionDisabled={terminal}
            locale={props.locale}
          />
          <BattleLogPanel entries={props.logEntries} locale={props.locale} />
        </div>
      </div>
      {props.cpuStatus === "thinking" || props.cpuStatus === "executing" ? (
        <div
          aria-live="polite"
          className="battle-cpu-status"
          data-testid="battle-cpu-status-overlay"
          role="status"
        >
          CPU {props.cpuStatus}
        </div>
      ) : null}
      <BattleResultOverlay
        viewModel={props.viewModel}
        locale={props.locale}
        onRematch={props.onRematch}
        onReturnToPreparation={props.onReturnToPreparation}
      />
      {detail ? (
        <BattleCardDetailPopover
          card={detail.card}
          position={detail.position}
          onPointerEnter={() => leaveTimer.current && clearTimeout(leaveTimer.current)}
          onPointerLeave={schedulePointerClose}
          locale={props.locale}
        />
      ) : null}
    </main>
  );
}

type DetailSource = "pointer" | "focus" | "touch";
interface DetailState {
  readonly card: NonNullable<PublicBattleView["boardSquares"][number]["occupant"]>;
  readonly element: HTMLElement;
  readonly source: DetailSource;
  readonly position: { readonly left: number; readonly top: number };
}

function calculateDetailPosition(element: HTMLElement): { readonly left: number; readonly top: number } {
  const rect = element.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 16);
  const height = 260;
  const below = rect.bottom + 8;
  const top = below + height <= window.innerHeight ? below : Math.max(8, rect.top - height - 8);
  return { left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top };
}

function createIdleInteraction(viewModel: PublicBattleView): BattleInteractionControlsView {
  return {
    kind: "idle",
    confirmEnabled: false,
    cancelEnabled: false,
    undoEnabled: false,
    endPlayPhaseEnabled:
      viewModel.phase === "play" &&
      viewModel.activeSide === "player" &&
      !viewModel.terminalResult,
    instruction: "Select an available creature from your hand."
  };
}

function noOperation(): void {}

function resonanceIssueMessage(locale: "ja" | "en" | undefined, code: string | undefined): string {
  if (!code) return "";
  return uiText(locale, code, uiText(locale, "battle.resonance.unknown"));
}
