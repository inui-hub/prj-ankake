import type { BattleCommand, BattleLogEntry, PublicBattleView } from "@ankake/domain";
import { BattleBoard } from "./BattleBoard";
import { BattleResultOverlay } from "./BattleDialogs";
import {
  BattleActionPanel,
  BattleInfoPanels,
  BattleLogPanel,
  BattleStatusPanel
} from "./BattlePanels";

export interface BattleScreenProps {
  readonly viewModel: PublicBattleView;
  readonly logEntries: readonly BattleLogEntry[];
  readonly cpuStatus: "idle" | "thinking" | "executing" | "completed" | "limit-reached";
  readonly onReturnToPreparation: () => void;
  readonly onReturnToMenu: () => void;
  readonly onSubmitCommand: (command: BattleCommand) => void;
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
        <BattleBoard squares={props.viewModel.boardSquares} />
        <div className="battle-side-rail">
          <BattleInfoPanels viewModel={props.viewModel} />
          <BattleActionPanel
            legalActions={props.viewModel.legalActions}
            onSubmitCommand={props.onSubmitCommand}
            onEndPlayPhase={props.onEndPlayPhase}
          />
          <BattleLogPanel entries={props.logEntries} />
        </div>
      </div>
      {props.cpuStatus === "thinking" || props.cpuStatus === "executing" ? (
        <div className="battle-cpu-status" data-testid="battle-cpu-status-overlay">
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
