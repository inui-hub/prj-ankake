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
  readonly locale?: "ja" | "en";
}

export function BattlePreparationScreen(props: BattlePreparationScreenProps) {
  const { viewModel } = props;
  const ja = props.locale === "ja";
  const battleReadyDecks = viewModel.deckOptions.filter((deck) => deck.battleReady);

  return (
    <main className="battle-prep-screen" data-testid="battle-preparation-screen">
      <header className="battle-prep-header">
        <button className="battle-button battle-button--quiet" type="button" onClick={props.onReturnToMenu}>
          {ja ? "戻る" : "Back"}
        </button>
        <div>
          <p className="battle-kicker">{ja ? "CPU対戦" : "CPU Battle"}</p>
          <h1>{ja ? "対戦準備" : "Prepare Battle"}</h1>
        </div>
      </header>

      <section className="battle-prep-grid">
        <DeckSelector
          label={ja ? "プレイヤーデッキ" : "Player deck"}
          testId="battle-prep-player-deck-selector"
          deckId={viewModel.playerDeckId}
          decks={viewModel.deckOptions}
          onChange={props.onSelectPlayerDeck} locale={props.locale}
        />
        <DeckSelector
          label={ja ? "CPUデッキ" : "CPU deck"}
          testId="battle-prep-cpu-deck-selector"
          deckId={viewModel.cpuDeckId}
          decks={viewModel.deckOptions}
          onChange={props.onSelectCpuDeck} locale={props.locale}
        />
        <fieldset className="battle-panel battle-first-player" data-testid="battle-prep-first-player-mode">
          <legend>{ja ? "先攻" : "First player"}</legend>
          <label>
            <input
              checked={viewModel.firstPlayerMode === "random"}
              name="first-player-mode"
              type="radio"
              onChange={() => props.onFirstPlayerModeChange("random")}
            />
            {ja ? "ランダム" : "Random"}
          </label>
          <label>
            <input
              checked={viewModel.firstPlayerMode === "player-first"}
              name="first-player-mode"
              type="radio"
              onChange={() => props.onFirstPlayerModeChange("player-first")}
            />
            {ja ? "プレイヤー先攻" : "Player first"}
          </label>
          <label>
            <input
              checked={viewModel.firstPlayerMode === "player-second"}
              name="first-player-mode"
              type="radio"
              onChange={() => props.onFirstPlayerModeChange("player-second")}
            />
            {ja ? "プレイヤー後攻" : "Player second"}
          </label>
        </fieldset>

        <section className="battle-panel battle-start-panel">
          <h2>{ja ? "開始" : "Start"}</h2>
          <p>{ja ? `対戦可能なデッキ: ${battleReadyDecks.length}` : `${battleReadyDecks.length} battle-ready deck(s) available.`}</p>
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
            {viewModel.loading ? (ja ? "読み込み中..." : "Loading...") : (ja ? "対戦開始" : "Start Battle")}
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
  readonly locale?: "ja" | "en";
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
          {props.locale === "ja" ? "デッキを選択" : "Select deck"}
        </option>
        {props.decks.map((deck) => (
          <option key={deck.deckId} disabled={!deck.battleReady} value={deck.deckId}>
            {deck.name} - {props.locale === "ja" ? `${deck.cardCount} 枚` : `${deck.cardCount} cards`}{deck.battleReady ? "" : props.locale === "ja" ? " - 対戦準備未完了" : " - not ready"}
          </option>
        ))}
      </select>
    </label>
  );
}
