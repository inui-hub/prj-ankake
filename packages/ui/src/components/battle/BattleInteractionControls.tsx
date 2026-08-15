export interface BattleInteractionControlsView {
  readonly kind: "idle" | "selecting-summon" | "selecting-move" | "selecting-effect";
  readonly selectedHandInstanceId?: string;
  readonly selectedCreatureInstanceId?: string;
  readonly candidateDestinationKeys?: readonly string[];
  readonly selectedDestinationKey?: string;
  readonly selectedCardName?: string;
  readonly selectedCardCost?: number;
  readonly effectCandidates?: readonly { readonly kind: "creature" | "base" | "lane" | "coordinate" | "graveyard"; readonly id: string; readonly label: string; readonly selected: boolean }[];
  readonly movementOriginKey?: string;
  readonly movementPathSteps?: readonly {
    readonly key: string;
    readonly stepNumber: number;
  }[];
  readonly provisionalPositionKey?: string;
  readonly movementUsed?: number;
  readonly movementMaximum?: number;
  readonly confirmEnabled: boolean;
  readonly cancelEnabled: boolean;
  readonly undoEnabled?: boolean;
  readonly endPlayPhaseEnabled: boolean;
  readonly instruction: string;
  readonly issue?: string;
}

export interface BattleInteractionControlsProps {
  readonly interaction: BattleInteractionControlsView;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onUndo: () => void;
  readonly onEndPlayPhase: () => void;
  readonly onEffectCandidate?: (id: string) => void;
  readonly interactionDisabled?: boolean;
}

export function BattleInteractionControls(props: BattleInteractionControlsProps) {
  const selectingSummon = props.interaction.kind === "selecting-summon";
  const selectingMove = props.interaction.kind === "selecting-move";
  const selectingEffect = props.interaction.kind === "selecting-effect";
  const selecting = selectingSummon || selectingMove || selectingEffect;

  return (
    <section
      className="battle-panel battle-phase-controls battle-interaction-controls"
      data-testid="battle-interaction-controls"
    >
      <h2>
        {selectingSummon
          ? "Summon creature"
          : selectingMove
            ? "Move creature"
            : selectingEffect
              ? "Choose spell target"
            : "Phase control"}
      </h2>
      <div className="battle-interaction-controls__status">
        {selecting ? (
          <strong data-testid="battle-interaction-selected-card">
            {props.interaction.selectedCardName ?? "Selected creature"}
            {props.interaction.selectedCardCost !== undefined
              ? ` - Cost ${props.interaction.selectedCardCost}`
              : ""}
          </strong>
        ) : null}
        {selectingMove ? (
          <span data-testid="battle-movement-budget">
            Movement {props.interaction.movementUsed ?? 0} / {props.interaction.movementMaximum ?? 0}
          </span>
        ) : null}
        {selectingEffect ? (
          <div data-testid="battle-effect-candidates">
            {props.interaction.effectCandidates?.map((candidate) => (
              <button key={`${candidate.kind}:${candidate.id}`} type="button"
                className="battle-button battle-button--quiet" data-testid={`battle-effect-target-${candidate.kind}-${candidate.id}`}
                aria-pressed={candidate.selected} disabled={props.interactionDisabled}
                onClick={() => props.onEffectCandidate?.(candidate.id)}>
                {candidate.selected ? "Selected: " : "Select: "}{candidate.label}
              </button>
            ))}
          </div>
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
            disabled={props.interactionDisabled || !props.interaction.confirmEnabled}
            type="button"
            onClick={props.onConfirm}
          >
            Confirm Summon
          </button>
          <button
            className="battle-button battle-button--quiet"
            data-testid="battle-summon-cancel-button"
            disabled={props.interactionDisabled || !props.interaction.cancelEnabled}
            type="button"
            onClick={props.onCancel}
          >
            Cancel Summon
          </button>
        </div>
      ) : null}
      {selectingMove ? (
        <div className="battle-interaction-controls__actions battle-interaction-controls__actions--move">
          <button
            className="battle-button battle-button--primary"
            data-testid="battle-move-confirm-button"
            disabled={props.interactionDisabled || !props.interaction.confirmEnabled}
            type="button"
            onClick={props.onConfirm}
          >
            Confirm Move
          </button>
          <button
            className="battle-button battle-button--quiet"
            data-testid="battle-move-undo-button"
            disabled={props.interactionDisabled || !props.interaction.undoEnabled}
            type="button"
            onClick={props.onUndo}
          >
            Undo Step
          </button>
          <button
            className="battle-button battle-button--quiet"
            data-testid="battle-move-cancel-button"
            disabled={props.interactionDisabled || !props.interaction.cancelEnabled}
            type="button"
            onClick={props.onCancel}
          >
            Cancel Move
          </button>
        </div>
      ) : null}
      {selectingEffect ? (
        <div className="battle-interaction-controls__actions">
          <button className="battle-button battle-button--primary" data-testid="battle-effect-confirm-button" disabled={props.interactionDisabled || !props.interaction.confirmEnabled} type="button" onClick={props.onConfirm}>Confirm Spell</button>
          <button className="battle-button battle-button--quiet" data-testid="battle-effect-cancel-button" disabled={props.interactionDisabled || !props.interaction.cancelEnabled} type="button" onClick={props.onCancel}>Cancel Spell</button>
        </div>
      ) : null}
      <button
        className="battle-button battle-button--primary"
        data-testid="battle-end-play-phase-button"
        disabled={props.interactionDisabled || !props.interaction.endPlayPhaseEnabled}
        type="button"
        onClick={props.onEndPlayPhase}
      >
        End Play Phase
      </button>
    </section>
  );
}
