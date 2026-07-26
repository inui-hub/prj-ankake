import type { FirstPlayerMode, SavedDeckSummary } from "@ankake/domain";

export interface BattlePreparationScreenViewModel {
  readonly deckOptions: readonly SavedDeckSummary[];
  readonly playerDeckId?: string;
  readonly cpuDeckId?: string;
  readonly firstPlayerMode: FirstPlayerMode;
  readonly loading: boolean;
  readonly error?: string;
}

export interface BattlePreparationScreenProps {
  readonly viewModel: BattlePreparationScreenViewModel;
  readonly startDisabledReason?: string;
  readonly onReturnToMenu: () => void;
  readonly onSelectPlayerDeck: (deckId: string) => void;
  readonly onSelectCpuDeck: (deckId: string) => void;
  readonly onFirstPlayerModeChange: (mode: FirstPlayerMode) => void;
  readonly onStartBattle: () => void;
}

export function BattlePreparationScreen(props: BattlePreparationScreenProps) {
  const { viewModel } = props;
  const battleReadyDecks = viewModel.deckOptions.filter((deck) => deck.battleReady);

  return (
    <main className="battle-prep-screen" data-testid="battle-preparation-screen">
      <header className="battle-prep-header">
        <button className="battle-button battle-button--quiet" type="button" onClick={props.onReturnToMenu}>
          Back
        </button>
        <div>
          <p className="battle-kicker">CPU Battle</p>
          <h1>Prepare Battle</h1>
        </div>
      </header>

      <section className="battle-prep-grid">
        <DeckSelector
          label="Player deck"
          testId="battle-prep-player-deck-selector"
          deckId={viewModel.playerDeckId}
          decks={viewModel.deckOptions}
          onChange={props.onSelectPlayerDeck}
        />
        <DeckSelector
          label="CPU deck"
          testId="battle-prep-cpu-deck-selector"
          deckId={viewModel.cpuDeckId}
          decks={viewModel.deckOptions}
          onChange={props.onSelectCpuDeck}
        />
        <fieldset className="battle-panel battle-first-player" data-testid="battle-prep-first-player-mode">
          <legend>First player</legend>
          <label>
            <input
              checked={viewModel.firstPlayerMode === "random"}
              name="first-player-mode"
              type="radio"
              onChange={() => props.onFirstPlayerModeChange("random")}
            />
            Random
          </label>
          <label>
            <input
              checked={viewModel.firstPlayerMode === "player-first"}
              name="first-player-mode"
              type="radio"
              onChange={() => props.onFirstPlayerModeChange("player-first")}
            />
            Player first
          </label>
          <label>
            <input
              checked={viewModel.firstPlayerMode === "player-second"}
              name="first-player-mode"
              type="radio"
              onChange={() => props.onFirstPlayerModeChange("player-second")}
            />
            Player second
          </label>
        </fieldset>

        <section className="battle-panel battle-start-panel">
          <h2>Start</h2>
          <p>{battleReadyDecks.length} battle-ready deck(s) available.</p>
          {props.startDisabledReason ? (
            <p className="battle-warning" data-testid="battle-prep-error">
              {props.startDisabledReason}
            </p>
          ) : null}
          {viewModel.error ? (
            <p className="battle-warning" data-testid="battle-prep-error">
              {viewModel.error}
            </p>
          ) : null}
          <button
            className="battle-button battle-button--primary"
            data-testid="battle-prep-start-button"
            disabled={Boolean(props.startDisabledReason) || viewModel.loading}
            type="button"
            onClick={props.onStartBattle}
          >
            {viewModel.loading ? "Loading..." : "Start Battle"}
          </button>
        </section>
      </section>
    </main>
  );
}

interface DeckSelectorProps {
  readonly label: string;
  readonly testId: string;
  readonly deckId?: string;
  readonly decks: readonly SavedDeckSummary[];
  readonly onChange: (deckId: string) => void;
}

function DeckSelector(props: DeckSelectorProps) {
  return (
    <label className="battle-panel battle-deck-selector">
      <span>{props.label}</span>
      <select
        data-testid={props.testId}
        value={props.deckId ?? ""}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      >
        <option value="" disabled>
          Select deck
        </option>
        {props.decks.map((deck) => (
          <option key={deck.deckId} disabled={!deck.battleReady} value={deck.deckId}>
            {deck.name} - {deck.cardCount} cards{deck.battleReady ? "" : " - not ready"}
          </option>
        ))}
      </select>
    </label>
  );
}
