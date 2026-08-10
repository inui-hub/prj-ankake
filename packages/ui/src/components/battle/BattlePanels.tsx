import type {
  BattleBaseId,
  BattleBaseView,
  BattleLogEntry,
  PublicBattleView
} from "@ankake/domain";

export interface BattleStatusPanelProps {
  readonly viewModel: PublicBattleView;
  readonly cpuStatus: string;
  readonly onReturnToMenu: () => void;
  readonly onQuitBattle: () => void;
}

export function BattleStatusPanel(props: BattleStatusPanelProps) {
  const { viewModel } = props;

  return (
    <header className="battle-status-bar" data-testid="battle-status-bar">
      <div>
        <p className="battle-kicker">Turn {viewModel.turnNumber}</p>
        <h1>
          {viewModel.activeSide === "player" ? "Player" : "CPU"} -{" "}
          {phaseLabel(viewModel.phase)}
        </h1>
      </div>
      <span data-testid="battle-turn-timer">90s</span>
      <span aria-live="polite" data-testid="battle-cpu-status">
        CPU {props.cpuStatus}
      </span>
      <button
        className="battle-button battle-button--quiet"
        data-testid="battle-quit-button"
        type="button"
        onClick={props.onQuitBattle}
      >
        Quit
      </button>
      <button
        className="battle-button battle-button--quiet"
        data-testid="battle-menu-button"
        type="button"
        onClick={props.onReturnToMenu}
      >
        Menu
      </button>
    </header>
  );
}

export interface BattlePhaseControlsProps {
  readonly canEndPlayPhase: boolean;
  readonly onEndPlayPhase: () => void;
}

export function BattlePhaseControls(props: BattlePhaseControlsProps) {
  return (
    <section
      className="battle-panel battle-phase-controls"
      data-testid="battle-phase-controls"
    >
      <h2>Phase control</h2>
      <button
        className="battle-button battle-button--primary"
        data-testid="battle-end-play-phase-button"
        disabled={!props.canEndPlayPhase}
        type="button"
        onClick={props.onEndPlayPhase}
      >
        End Play Phase
      </button>
    </section>
  );
}

export function BattleInfoPanels(props: { readonly viewModel: PublicBattleView }) {
  const { viewModel } = props;

  return (
    <aside className="battle-info-grid">
      <section className="battle-panel" data-testid="battle-player-info-panel">
        <h2>Player</h2>
        <p data-testid="battle-player-pp">
          PP: {viewModel.playerCurrentPp}/{viewModel.playerMaxPp}
        </p>
        <p>Hand: {viewModel.playerHand.length}</p>
        <p>Deck: {viewModel.playerDeckCount}</p>
      </section>
      <section className="battle-panel" data-testid="battle-opponent-info-panel">
        <h2>CPU</h2>
        <p>Hand: {viewModel.cpuHandCount}</p>
        <p>Deck: {viewModel.cpuDeckCount}</p>
      </section>
      <section className="battle-panel battle-base-summary" data-testid="battle-base-summary">
        <h2>Bases</h2>
        <ol>
          {viewModel.bases.map((base) => (
            <li data-testid={`battle-base-summary-${base.id}`} key={base.id}>
              <strong>{base.label}</strong><span>{ownerLabel(base.owner)}</span><span>HP {base.currentHp}/{base.maxHp}</span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function ownerLabel(owner: "none" | "player" | "cpu"): string { return owner === "none" ? "Unclaimed" : owner === "player" ? "Player" : "CPU"; }

function phaseLabel(phase: PublicBattleView["phase"]): string {
  switch (phase) {
    case "play":
      return "Play phase";
    case "automatic":
      return "Automatic phase";
    case "terminal":
      return "Battle complete";
  }
}

export function BattleLogPanel(props: { readonly entries: readonly BattleLogEntry[] }) {
  return (
    <section className="battle-panel battle-log-panel" data-testid="battle-log-panel">
      <h2>Battle log</h2>
      <ol>
        {props.entries.map((entry) => (
          <li key={entry.sequence}>{entry.message}</li>
        ))}
      </ol>
    </section>
  );
}
