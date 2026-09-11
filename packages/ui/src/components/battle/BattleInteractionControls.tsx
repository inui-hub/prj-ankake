import { battleText, localizeBattleInstruction, localizeBattleIssue } from "../../localization";

export interface BattleInteractionControlsView {
  readonly kind: "idle" | "selecting-summon" | "selecting-move" | "selecting-effect";
  readonly selectedHandInstanceId?: string;
  readonly selectedCreatureInstanceId?: string;
  readonly candidateDestinationKeys?: readonly string[];
  readonly selectedDestinationKey?: string;
  readonly selectedCardName?: string;
  readonly selectedCardCost?: number;
  readonly effectAction?: "summon" | "spell";
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
  /** Legacy fallback for embedders; application views use `instructionKey`. */
  readonly instruction?: string;
  readonly instructionKey?: "idle" | "move-start" | "move-continue" | "summon" | "effect";
  readonly issue?: string;
  readonly issueCode?: string;
}

export interface BattleInteractionControlsProps {
  readonly interaction: BattleInteractionControlsView;
  readonly onCancel: () => void;
  readonly onUndo: () => void;
  readonly onEndPlayPhase: () => void;
  readonly onEffectCandidate?: (id: string) => void;
  readonly interactionDisabled?: boolean;
  readonly locale?: "ja" | "en";
}

export function BattleInteractionControls(props: BattleInteractionControlsProps) {
  const selectingSummon = props.interaction.kind === "selecting-summon";
  const selectingMove = props.interaction.kind === "selecting-move";
  const selectingEffect = props.interaction.kind === "selecting-effect";
  const selecting = selectingSummon || selectingMove || selectingEffect;
  const graveyardCandidates = props.interaction.effectCandidates?.filter(
    (candidate) => candidate.kind === "graveyard"
  );

  return (
    <section
      className="battle-panel battle-phase-controls battle-interaction-controls"
      data-testid="battle-interaction-controls"
    >
      <h2>
          {selectingSummon
          ? battleText(props.locale, "battle.summon")
          : selectingMove
            ? battleText(props.locale, "battle.move")
          : selectingEffect
              ? props.interaction.effectAction === "summon"
                ? battleText(props.locale, "battle.choose-summon-target")
                : battleText(props.locale, "battle.choose-spell-target")
            : battleText(props.locale, "battle.phase-control")}
      </h2>
      <div className="battle-interaction-controls__status">
        {selecting ? (
          <strong data-testid="battle-interaction-selected-card">
            {props.interaction.selectedCardName ?? battleText(props.locale, "battle.selected-creature")}
            {props.interaction.selectedCardCost !== undefined
              ? ` - ${battleText(props.locale, "battle.cost")} ${props.interaction.selectedCardCost}`
              : ""}
          </strong>
        ) : null}
        {selectingMove ? (
          <span data-testid="battle-movement-budget">
            {battleText(props.locale, "battle.movement")} {props.interaction.movementUsed ?? 0} / {props.interaction.movementMaximum ?? 0}
          </span>
        ) : null}
        {selectingEffect && graveyardCandidates?.length ? (
          <div data-testid="battle-effect-candidates">
            {graveyardCandidates.map((candidate) => (
              <button key={`${candidate.kind}:${candidate.id}`} type="button"
                className="battle-button battle-button--quiet" data-testid={`battle-effect-target-${candidate.kind}-${candidate.id}`}
                aria-pressed={candidate.selected} disabled={props.interactionDisabled}
                onClick={() => props.onEffectCandidate?.(candidate.id)}>
                {candidate.selected ? `${battleText(props.locale, "battle.selected")}: ` : `${battleText(props.locale, "battle.select")}: `}{candidate.label}
              </button>
            ))}
          </div>
        ) : null}
        <p data-testid="battle-interaction-instruction">
          {props.interaction.instructionKey ? localizeBattleInstruction(props.locale, props.interaction.instructionKey) : props.interaction.instruction ?? localizeBattleInstruction(props.locale, "idle")}
        </p>
        <p
          aria-live="polite"
          className="battle-interaction-controls__issue"
          data-testid="battle-interaction-issue"
          role="status"
        >
          {props.interaction.issueCode ? localizeBattleIssue(props.locale, props.interaction.issueCode, props.interaction.issue) : props.interaction.issue ?? ""}
        </p>
      </div>
      {selectingSummon ? (
        <div className="battle-interaction-controls__actions">
          <button
            className="battle-button battle-button--quiet"
            data-testid="battle-summon-cancel-button"
            disabled={props.interactionDisabled || !props.interaction.cancelEnabled}
            type="button"
            onClick={props.onCancel}
          >
            {battleText(props.locale, "battle.cancel-summon")}
          </button>
        </div>
      ) : null}
      {selectingMove ? (
        <div className="battle-interaction-controls__actions battle-interaction-controls__actions--move">
          <button
            className="battle-button battle-button--quiet"
            data-testid="battle-move-undo-button"
            disabled={props.interactionDisabled || !props.interaction.undoEnabled}
            type="button"
            onClick={props.onUndo}
          >
            {battleText(props.locale, "battle.undo-step")}
          </button>
          <button
            className="battle-button battle-button--quiet"
            data-testid="battle-move-cancel-button"
            disabled={props.interactionDisabled || !props.interaction.cancelEnabled}
            type="button"
            onClick={props.onCancel}
          >
            {battleText(props.locale, "battle.cancel-move")}
          </button>
        </div>
      ) : null}
      {selectingEffect ? (
        <div className="battle-interaction-controls__actions">
          <button className="battle-button battle-button--quiet" data-testid="battle-effect-cancel-button" disabled={props.interactionDisabled || !props.interaction.cancelEnabled} type="button" onClick={props.onCancel}>{props.interaction.effectAction === "summon" ? battleText(props.locale, "battle.cancel-summon") : battleText(props.locale, "battle.cancel-spell")}</button>
        </div>
      ) : null}
      <button
        className="battle-button battle-button--primary"
        data-testid="battle-end-play-phase-button"
        disabled={props.interactionDisabled || !props.interaction.endPlayPhaseEnabled}
        type="button"
        onClick={props.onEndPlayPhase}
      >
        {battleText(props.locale, "battle.end-play-phase")}
      </button>
    </section>
  );
}
