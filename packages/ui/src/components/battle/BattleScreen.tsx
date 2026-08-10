import type {
  BattleLogEntry,
  BoardCoordinate,
  PublicBattleView
} from "@ankake/domain";
import { BattleBoard } from "./BattleBoard";
import { BattleResultOverlay } from "./BattleDialogs";
import { BattleHand } from "./BattleHand";
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
  readonly onWaterBoost?: (instanceId: string) => void;
  readonly onHandCardIntent?: (instanceId: string) => void;
  readonly onBoardCreatureIntent?: (instanceId: string) => void;
  readonly onBoardSquareIntent?: (coordinate: BoardCoordinate) => void;
  readonly onConfirmInteraction?: () => void;
  readonly onCancelInteraction?: () => void;
  readonly onUndoInteraction?: () => void;
  readonly onRematch: () => void;
  readonly onQuitBattle: () => void;
}

export function BattleScreen(props: BattleScreenProps) {
  const interaction = props.interaction ?? createIdleInteraction(props.viewModel);
  const terminal = Boolean(props.viewModel.terminalResult);

  return (
    <main className="battle-screen" data-testid="battle-screen">
      <BattleStatusPanel
        viewModel={props.viewModel}
        cpuStatus={props.cpuStatus}
        onReturnToMenu={props.onReturnToMenu}
        onQuitBattle={props.onQuitBattle}
      />
      <div className="battle-shell">
        <div className="battle-main-column">
          <BattleBoard
            squares={props.viewModel.boardSquares}
            candidateKeys={interaction.candidateDestinationKeys}
            selectedKey={interaction.selectedDestinationKey}
            selectedCreatureInstanceId={interaction.selectedCreatureInstanceId}
            movementOriginKey={interaction.movementOriginKey}
            movementPathSteps={interaction.movementPathSteps}
            provisionalPositionKey={interaction.provisionalPositionKey}
            interactionDisabled={terminal}
            onCreatureIntent={terminal ? undefined : props.onBoardCreatureIntent}
            onSquareIntent={terminal ? undefined : props.onBoardSquareIntent}
          />
          <BattleHand
            cards={props.viewModel.playerHand}
            selectedInstanceId={interaction.selectedHandInstanceId}
            interactionDisabled={terminal}
            onCardIntent={terminal ? undefined : props.onHandCardIntent}
          />
        </div>
        <div className="battle-side-rail">
          <BattleInfoPanels
            viewModel={props.viewModel}
            onWaterBoost={terminal ? undefined : props.onWaterBoost}
          />
          <BattleInteractionControls
            interaction={interaction}
            onConfirm={props.onConfirmInteraction ?? noOperation}
            onCancel={props.onCancelInteraction ?? noOperation}
            onUndo={props.onUndoInteraction ?? noOperation}
            onEndPlayPhase={props.onEndPlayPhase}
            interactionDisabled={terminal}
          />
          <BattleLogPanel entries={props.logEntries} />
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
        onRematch={props.onRematch}
        onReturnToPreparation={props.onReturnToPreparation}
      />
    </main>
  );
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
