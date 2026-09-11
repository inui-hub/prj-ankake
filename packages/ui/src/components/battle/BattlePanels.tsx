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
  readonly locale?: "ja" | "en";
  readonly interactionDisabled?: boolean;
}

export function BattleStatusPanel(props: BattleStatusPanelProps) {
  const { viewModel } = props;

  return (
    <header className="battle-status-bar" data-testid="battle-status-bar">
      <div>
        <p className="battle-kicker">{props.locale === "ja" ? "ターン" : "Turn"} {viewModel.turnNumber}</p>
        <h1>
          {viewModel.activeSide === "player" ? (props.locale === "ja" ? "プレイヤー" : "Player") : "CPU"} -{" "}
          {phaseLabel(viewModel.phase, props.locale)}
        </h1>
      </div>
      <span data-testid="battle-turn-timer">90s</span>
      <span aria-live="polite" data-testid="battle-cpu-status">
        CPU {cpuStatusLabel(props.cpuStatus, props.locale)}
      </span>
      <button
        className="battle-button battle-button--quiet"
        data-testid="battle-quit-button"
        disabled={props.interactionDisabled}
        type="button"
        onClick={props.onQuitBattle}
      >
        {props.locale === "ja" ? "対戦をやめる" : "Quit"}
      </button>
      <button
        className="battle-button battle-button--quiet"
        data-testid="battle-menu-button"
        disabled={props.interactionDisabled}
        type="button"
        onClick={props.onReturnToMenu}
      >
        {props.locale === "ja" ? "メニュー" : "Menu"}
      </button>
    </header>
  );
}

export interface BattlePhaseControlsProps {
  readonly canEndPlayPhase: boolean;
  readonly onEndPlayPhase: () => void;
  readonly locale?: "ja" | "en";
}

export function BattlePhaseControls(props: BattlePhaseControlsProps) {
  return (
    <section
      className="battle-panel battle-phase-controls"
      data-testid="battle-phase-controls"
    >
      <h2>{props.locale === "ja" ? "フェーズ操作" : "Phase control"}</h2>
      <button
        className="battle-button battle-button--primary"
        data-testid="battle-end-play-phase-button"
        disabled={!props.canEndPlayPhase}
        type="button"
        onClick={props.onEndPlayPhase}
      >
        {props.locale === "ja" ? "プレイフェーズを終了" : "End Play Phase"}
      </button>
    </section>
  );
}

export function BattleInfoPanels(props: {
  readonly viewModel: PublicBattleView;
  readonly locale?: "ja" | "en";
}) {
  const { viewModel } = props;

  return (
    <aside className="battle-info-grid">
      <section className="battle-panel" data-testid="battle-player-info-panel">
        <h2>{props.locale === "ja" ? "プレイヤー" : "Player"}</h2>
        <p data-testid="battle-player-pp">
          PP: {viewModel.playerCurrentPp}/{viewModel.playerMaxPp}
        </p>
        <p>{props.locale === "ja" ? "手札" : "Hand"}: {viewModel.playerHand.length}</p>
        <p>{props.locale === "ja" ? "デッキ" : "Deck"}: {viewModel.playerDeckCount}</p>
        <ResonanceTable viewModel={viewModel} locale={props.locale} />
      </section>
      <section className="battle-panel" data-testid="battle-opponent-info-panel">
        <h2>CPU</h2>
        <p>{props.locale === "ja" ? "手札" : "Hand"}: {viewModel.cpuHandCount}</p>
        <p>{props.locale === "ja" ? "デッキ" : "Deck"}: {viewModel.cpuDeckCount}</p>
      </section>
      <section className="battle-panel battle-base-summary" data-testid="battle-base-summary">
        <h2>{props.locale === "ja" ? "拠点" : "Bases"}</h2>
        <ol>
          {viewModel.bases.map((base) => (
            <li data-testid={`battle-base-summary-${base.id}`} key={base.id}>
              <strong>{base.label}</strong><span>{ownerLabel(base.owner, props.locale)}</span><span>HP {base.currentHp}/{base.maxHp}</span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function ResonanceTable(props: { readonly viewModel: PublicBattleView; readonly locale?: "ja" | "en" }) {
  const lanes = ["left", "center", "right"] as const;
  const attributes = ["fire", "water", "wind", "light", "dark"] as const;
  const label = (value: string) => props.locale === "ja" ? ({ left: "左", center: "中央", right: "右", fire: "火", water: "水", wind: "風", light: "光", dark: "闇" }[value] ?? value) : value;
  return <table className="battle-resonance-table" data-testid="battle-player-resonance">
    <caption>{props.locale === "ja" ? "共鳴" : "Resonance"}</caption>
    <thead><tr><th scope="col">{props.locale === "ja" ? "属性" : "Attribute"}</th>{lanes.map((lane) => <th key={lane} scope="col">{label(lane)}</th>)}</tr></thead>
    <tbody>{attributes.map((attribute) => <tr key={attribute}><th scope="row">{label(attribute)}</th>{lanes.map((lane) => <td key={lane} data-testid={`battle-resonance-${lane}-${attribute}`}>{props.viewModel.playerResonance[lane]?.[attribute] ?? 0}</td>)}</tr>)}</tbody>
  </table>;
}

function ownerLabel(owner: "none" | "player" | "cpu", locale?: "ja" | "en"): string { return locale === "ja" ? owner === "none" ? "中立" : owner === "player" ? "味方" : "敵" : owner === "none" ? "Unclaimed" : owner === "player" ? "Player" : "CPU"; }

function phaseLabel(phase: PublicBattleView["phase"], locale?: "ja" | "en"): string {
  switch (phase) {
    case "play":
      return locale === "ja" ? "プレイフェーズ" : "Play phase";
    case "automatic":
      return locale === "ja" ? "自動フェーズ" : "Automatic phase";
    case "terminal":
      return locale === "ja" ? "対戦終了" : "Battle complete";
  }
}

function cpuStatusLabel(status: string, locale?: "ja" | "en"): string {
  if (locale !== "ja") return status;
  return ({ idle: "待機中", thinking: "思考中", executing: "実行中", completed: "完了", "limit-reached": "上限到達" }[status] ?? status);
}

export function BattleLogPanel(props: { readonly entries: readonly BattleLogEntry[]; readonly locale?: "ja" | "en" }) {
  return (
    <section className="battle-panel battle-log-panel" data-testid="battle-log-panel">
      <h2>{props.locale === "ja" ? "対戦ログ" : "Battle log"}</h2>
      <ol>
        {props.entries.map((entry) => (
          <li key={entry.sequence}>{localizeLogMessage(entry, props.locale)}</li>
        ))}
      </ol>
    </section>
  );
}

function localizeLogMessage(entry: BattleLogEntry, locale?: "ja" | "en"): string {
  if (locale !== "ja") return entry.message;
  const known: Readonly<Record<string, string>> = {
    "card.drawn": "カードを1枚引きました。",
    "battle.ended": "対戦が終了しました。"
  };
  return known[entry.type] ?? entry.message;
}
