import type { BattleLogEntry, PublicBattleView } from "@ankake/domain";
import { BattleBoard } from "./BattleBoard";
import { BattleResultOverlay } from "./BattleDialogs";
import { BattleHand } from "./BattleHand";
import {
  BattleInfoPanels,
  BattleLogPanel,
  BattlePhaseControls,
  BattleStatusPanel
} from "./BattlePanels";

export interface BattleScreenProps {
  readonly viewModel: PublicBattleView;
  readonly logEntries: readonly BattleLogEntry[];
  readonly cpuStatus: "idle" | "thinking" | "executing" | "completed" | "limit-reached";
  readonly onReturnToPreparation: () => void;
  readonly onReturnToMenu: () => void;
  readonly onEndPlayPhase: () => void;
  readonly onRematch: () => void;
  readonly onQuitBattle: () => void;
}

export function BattleScreen(props: BattleScreenProps) {
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
          <BattleBoard squares={props.viewModel.boardSquares} />
          <BattleHand cards={props.viewModel.playerHand} />
        </div>
        <div className="battle-side-rail">
          <BattleInfoPanels viewModel={props.viewModel} />
          <BattlePhaseControls
            canEndPlayPhase={
              props.viewModel.phase === "play" &&
              props.viewModel.activeSide === "player" &&
              !props.viewModel.terminalResult
            }
            onEndPlayPhase={props.onEndPlayPhase}
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
