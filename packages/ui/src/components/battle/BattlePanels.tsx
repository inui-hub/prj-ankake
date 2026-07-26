import type { BattleCommand, BattleLogEntry, LegalAction, PublicBattleView } from "@ankake/domain";

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
        <h1>{viewModel.activeSide === "player" ? "Player" : "CPU"} play phase</h1>
      </div>
      <span data-testid="battle-turn-timer">90s</span>
      <span>{props.cpuStatus}</span>
      <button className="battle-button battle-button--quiet" type="button" onClick={props.onQuitBattle}>
        Quit
      </button>
      <button className="battle-button battle-button--quiet" type="button" onClick={props.onReturnToMenu}>
        Menu
      </button>
    </header>
  );
}

export interface BattleActionPanelProps {
  readonly legalActions: readonly LegalAction[];
  readonly onSubmitCommand: (command: BattleCommand) => void;
  readonly onEndPlayPhase: () => void;
}

export function BattleActionPanel(props: BattleActionPanelProps) {
  return (
    <section className="battle-panel battle-action-panel" data-testid="battle-action-panel">
      <h2>Actions</h2>
      <div className="battle-action-list">
        {props.legalActions.slice(0, 8).map((action, index) => (
          <button
            key={`${action.label}-${index}`}
            className="battle-button"
            data-testid={action.command.type === "endPlayPhase" ? "battle-end-play-phase-button" : undefined}
            type="button"
            onClick={() => props.onSubmitCommand(action.command)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <button
        className="battle-button battle-button--primary"
        data-testid="battle-command-confirm-button"
        disabled
        type="button"
      >
        Confirm selected command
      </button>
      <button
        className="battle-button battle-button--quiet"
        data-testid="battle-command-cancel-button"
        type="button"
        onClick={props.onEndPlayPhase}
      >
        Cancel / End phase
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
        <p>Base HP: {viewModel.playerBaseHp}</p>
        <p>Hand: {viewModel.playerHandCount}</p>
        <p>Deck: {viewModel.playerDeckCount}</p>
      </section>
      <section className="battle-panel" data-testid="battle-opponent-info-panel">
        <h2>CPU</h2>
        <p>Base HP: {viewModel.cpuBaseHp}</p>
        <p>Hand: {viewModel.cpuHandCount}</p>
        <p>Deck: {viewModel.cpuDeckCount}</p>
      </section>
      <section className="battle-panel" data-testid="battle-resonance-panel">
        <h2>Resonance</h2>
        <p>Lane resonance is tracked by the engine and reflected through logs.</p>
      </section>
    </aside>
  );
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
