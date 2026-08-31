import type { BattleTerminalReason, PublicBattleView } from "@ankake/domain";
import { type UiLocale, uiText } from "../../localization";

export function BattleResultOverlay(props: {
  readonly viewModel: PublicBattleView;
  readonly onRematch: () => void;
  readonly onReturnToPreparation: () => void;
  readonly locale?: UiLocale;
}) {
  const result = props.viewModel.terminalResult;

  if (!result) {
    return null;
  }

  return (
    <div className="battle-modal-backdrop" data-testid="battle-result-overlay">
      <section className="battle-modal">
        <h2>{result.winner === "player" ? uiText(props.locale, "battle.result.victory") : uiText(props.locale, "battle.result.defeat")}</h2>
        <p data-testid="battle-result-reason">{uiText(props.locale, "battle.result.reason")}: {reasonLabel(result.reason, props.locale)}</p>
        <p data-testid="battle-result-turn">{uiText(props.locale, "battle.result.turn")}: {result.turnNumber}</p>
        <div className="battle-modal__actions">
          <button className="battle-button battle-button--primary" data-testid="battle-rematch-button" type="button" onClick={props.onRematch}>
            {uiText(props.locale, "battle.result.rematch")}
          </button>
          <button className="battle-button" data-testid="battle-result-return-button" type="button" onClick={props.onReturnToPreparation}>
            {uiText(props.locale, "battle.result.return")}
          </button>
        </div>
      </section>
    </div>
  );
}

function reasonLabel(reason: BattleTerminalReason, locale: UiLocale | undefined): string {
  return uiText(locale, `battle.result.${reason}`);
}
