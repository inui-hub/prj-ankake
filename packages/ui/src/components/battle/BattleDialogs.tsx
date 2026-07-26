import type { PublicBattleView } from "@ankake/domain";

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
        <p>Reason: {result.reason}</p>
        <p>Turn: {result.turnNumber}</p>
        <div className="battle-modal__actions">
          <button className="battle-button battle-button--primary" type="button" onClick={props.onRematch}>
            Rematch
          </button>
          <button className="battle-button" type="button" onClick={props.onReturnToPreparation}>
            Return
          </button>
        </div>
      </section>
    </div>
  );
}
