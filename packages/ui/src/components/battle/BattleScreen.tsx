import type {
  BattleLogEntry,
  BattleEvent,
  BattleCardView,
  BoardCoordinate,
  PublicBattleView
} from "@ankake/domain";
import { useEffect, useRef, useState } from "react";
import { BattleBoard } from "./BattleBoard";
import { BattleResultOverlay } from "./BattleDialogs";
import { BattleHand } from "./BattleHand";
import { BattleCardDetailPopover } from "./BattleCardDetailPopover";
import { localizeBattleEvent, localizeBattleIssue, uiText } from "../../localization";
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
  readonly animationEvent?: BattleEvent;
  readonly isAnimating?: boolean;
  readonly defeatedCreature?: { readonly squareKey: string; readonly card: BattleCardView };
}

export function BattleScreen(props: BattleScreenProps) {
  const interaction = props.interaction ?? createIdleInteraction(props.viewModel);
  const terminal = Boolean(props.viewModel.terminalResult);
  const interactionDisabled = terminal || Boolean(props.isAnimating);
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
        interactionDisabled={interactionDisabled}
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
            interactionDisabled={interactionDisabled}
            animationEvent={props.animationEvent}
            defeatedCreature={props.defeatedCreature}
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
            interactionDisabled={interactionDisabled}
            onCardIntent={interactionDisabled ? undefined : props.onHandCardIntent}
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
            interactionDisabled={interactionDisabled}
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
      {props.animationEvent ? (
        <div aria-live="polite" className="battle-event-banner" data-testid="battle-event-banner" role="status">
          <span className={`battle-event-banner__icon battle-event-banner__icon--${eventTone(props.animationEvent)}`} aria-hidden="true" />
          <div><strong>{eventTitle(props.animationEvent, props.locale)}</strong><span>{localizeBattleEvent(props.locale, props.animationEvent)}</span></div>
        </div>
      ) : null}
      <BattleResultOverlay
        viewModel={props.viewModel}
        locale={props.locale}
        onRematch={props.onRematch}
        onReturnToPreparation={props.onReturnToPreparation}
        interactionDisabled={interactionDisabled}
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

function eventTone(event: BattleEvent): "summon" | "move" | "damage" | "capture" | "phase" {
  if (event.type === "creature.summoned" || event.type === "card.played") return "summon";
  if (event.type === "creature.moved") return "move";
  if (event.type === "base.captured") return "capture";
  if (event.type.includes("damaged") || event.type === "creature.destroyed") return "damage";
  return "phase";
}

function eventTitle(event: BattleEvent, locale: "ja" | "en" | undefined): string {
  const ja = locale === "ja";
  const titles: Partial<Record<BattleEvent["type"], string>> = ja ? {
    "creature.summoned": "クリーチャー召喚", "creature.moved": "クリーチャー移動",
    "creature.damaged": "ダメージ", "creature.destroyed": "クリーチャー破壊",
    "base.damaged": "拠点ダメージ", "base.captured": "拠点制圧", "phase.ended": "フェーズ終了",
    "attack.phase-started": "攻撃フェーズ", "battle.ended": "対戦終了", "card.drawn": "カードドロー",
    "resonance.changed": "共鳴変化", "resonance.effect-resolved": "共鳴効果"
  } : {
    "creature.summoned": "Summon", "creature.moved": "Move", "creature.damaged": "Damage",
    "creature.destroyed": "Destroyed", "base.damaged": "Base damage", "base.captured": "Base captured",
    "phase.ended": "Phase ended", "attack.phase-started": "Attack phase", "battle.ended": "Battle complete",
    "card.drawn": "Card drawn", "resonance.changed": "Resonance changed", "resonance.effect-resolved": "Resonance effect"
  };
  return titles[event.type] ?? (ja ? "対戦イベント" : "Battle event");
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
    instructionKey: "idle"
  };
}

function noOperation(): void {}

function resonanceIssueMessage(locale: "ja" | "en" | undefined, code: string | undefined): string {
  if (!code) return "";
  return localizeBattleIssue(locale, code, uiText(locale, "battle.resonance.unknown"));
}
