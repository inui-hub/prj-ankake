export interface BattleInteractionControlsView {
  readonly kind: "idle" | "selecting-summon";
  readonly selectedHandInstanceId?: string;
  readonly candidateDestinationKeys?: readonly string[];
  readonly selectedDestinationKey?: string;
  readonly selectedCardName?: string;
  readonly selectedCardCost?: number;
  readonly confirmEnabled: boolean;
  readonly cancelEnabled: boolean;
  readonly endPlayPhaseEnabled: boolean;
  readonly instruction: string;
  readonly issue?: string;
}

export interface BattleInteractionControlsProps {
  readonly interaction: BattleInteractionControlsView;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onEndPlayPhase: () => void;
}

export function BattleInteractionControls(props: BattleInteractionControlsProps) {
  const selectingSummon = props.interaction.kind === "selecting-summon";

  return (
    <section
      className="battle-panel battle-phase-controls battle-interaction-controls"
      data-testid="battle-interaction-controls"
    >
      <h2>{selectingSummon ? "Summon creature" : "Phase control"}</h2>
      <div className="battle-interaction-controls__status">
        {selectingSummon ? (
          <strong data-testid="battle-interaction-selected-card">
            {props.interaction.selectedCardName ?? "Selected creature"}
            {props.interaction.selectedCardCost !== undefined
              ? ` - Cost ${props.interaction.selectedCardCost}`
              : ""}
          </strong>
        ) : null}
        <p data-testid="battle-interaction-instruction">
          {props.interaction.instruction}
        </p>
        <p
          aria-live="polite"
          className="battle-interaction-controls__issue"
          data-testid="battle-interaction-issue"
          role="status"
        >
          {props.interaction.issue ?? ""}
        </p>
      </div>
      {selectingSummon ? (
        <div className="battle-interaction-controls__actions">
          <button
            className="battle-button battle-button--primary"
            data-testid="battle-summon-confirm-button"
            disabled={!props.interaction.confirmEnabled}
            type="button"
            onClick={props.onConfirm}
          >
            Confirm Summon
          </button>
          <button
            className="battle-button battle-button--quiet"
            data-testid="battle-summon-cancel-button"
            disabled={!props.interaction.cancelEnabled}
            type="button"
            onClick={props.onCancel}
          >
            Cancel Summon
          </button>
        </div>
      ) : null}
      <button
        className="battle-button battle-button--primary"
        data-testid="battle-end-play-phase-button"
        disabled={!props.interaction.endPlayPhaseEnabled}
        type="button"
        onClick={props.onEndPlayPhase}
      >
        End Play Phase
      </button>
    </section>
  );
}
