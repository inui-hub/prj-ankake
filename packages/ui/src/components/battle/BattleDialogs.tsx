import type { BattleTerminalReason, PublicBattleView } from "@ankake/domain";

export function BattleResultOverlay(props: {
  readonly viewModel: PublicBattleView;
  readonly onRematch: () => void;
  readonly onReturnToPreparation: () => void;
}) {
  const result = props.viewModel.terminalResult;

  if (!result) {
    return null;
  }

  return (
    <div className="battle-modal-backdrop" data-testid="battle-result-overlay">
      <section className="battle-modal">
        <h2>{result.winner === "player" ? "Victory" : "Defeat"}</h2>
        <p data-testid="battle-result-reason">Reason: {reasonLabel(result.reason)}</p>
        <p data-testid="battle-result-turn">Turn: {result.turnNumber}</p>
        <div className="battle-modal__actions">
          <button className="battle-button battle-button--primary" data-testid="battle-rematch-button" type="button" onClick={props.onRematch}>
            Rematch
          </button>
          <button className="battle-button" data-testid="battle-result-return-button" type="button" onClick={props.onReturnToPreparation}>
            Return
          </button>
        </div>
      </section>
    </div>
  );
}

function reasonLabel(reason: BattleTerminalReason): string {
  switch (reason) { case "base-destroyed": return "Enemy base destroyed"; case "neutral-bases-controlled": return "All neutral bases controlled"; case "deck-out": return "Opponent could not draw"; case "quit": return "Opponent conceded"; }
}
