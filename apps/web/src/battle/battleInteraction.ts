import {
  coordinateKey,
  projectPublicBattleView,
  querySummonStart,
  validateSummonDestination,
  type BattleCommand,
  type BattleValidationIssue,
  type BattleValidationIssueCode,
  type BattleState,
  type BoardCoordinate,
  type PublicBattleView
} from "@ankake/domain";

export type BattleInteractionIssueCode =
  | BattleValidationIssueCode
  | "battle.interaction.pending";

export interface BattleInteractionIssue {
  readonly code: BattleInteractionIssueCode;
  readonly message: string;
}

export type BattleInteractionState =
  | {
      readonly kind: "idle";
      readonly issue?: BattleInteractionIssue;
    }
  | {
      readonly kind: "selecting-summon";
      readonly handInstanceId: string;
      readonly candidateDestinations: readonly BoardCoordinate[];
      readonly destination?: BoardCoordinate;
      readonly issue?: BattleInteractionIssue;
    };

export interface BattleInteractionView {
  readonly kind: BattleInteractionState["kind"];
  readonly selectedHandInstanceId?: string;
  readonly candidateDestinationKeys: readonly string[];
  readonly selectedDestinationKey?: string;
  readonly selectedCardName?: string;
  readonly selectedCardCost?: number;
  readonly confirmEnabled: boolean;
  readonly cancelEnabled: boolean;
  readonly undoEnabled: false;
  readonly endPlayPhaseEnabled: boolean;
  readonly instruction: string;
  readonly issue?: string;
}

export type SummonConfirmationPreparation =
  | {
      readonly ok: true;
      readonly command: Extract<BattleCommand, { type: "summonCreature" }>;
    }
  | {
      readonly ok: false;
      readonly interaction: BattleInteractionState;
    };

export const IDLE_BATTLE_INTERACTION: BattleInteractionState = Object.freeze({
  kind: "idle"
});

export function selectSummonHandCard(
  interaction: BattleInteractionState,
  state: BattleState,
  handInstanceId: string
): BattleInteractionState {
  if (
    interaction.kind === "selecting-summon" &&
    interaction.handInstanceId === handInstanceId
  ) {
    return IDLE_BATTLE_INTERACTION;
  }

  const result = querySummonStart(state, "player", handInstanceId);
  if (!result.eligible) {
    return interaction.kind === "selecting-summon"
      ? interaction
      : createIdleInteraction(result.issues);
  }

  return {
    kind: "selecting-summon",
    handInstanceId,
    candidateDestinations: result.candidateDestinations
  };
}

export function selectSummonDestination(
  interaction: BattleInteractionState,
  destination: BoardCoordinate
): BattleInteractionState {
  if (interaction.kind !== "selecting-summon") {
    return interaction;
  }

  const destinationKey = coordinateKey(destination);
  const candidate = interaction.candidateDestinations.find(
    (coordinate) => coordinateKey(coordinate) === destinationKey
  );
  if (!candidate) {
    return interaction;
  }

  return {
    ...interaction,
    destination: candidate,
    issue: undefined
  };
}

export function prepareSummonConfirmation(
  interaction: BattleInteractionState,
  state: BattleState
): SummonConfirmationPreparation {
  if (interaction.kind !== "selecting-summon" || !interaction.destination) {
    return {
      ok: false,
      interaction
    };
  }

  const result = querySummonStart(state, "player", interaction.handInstanceId);
  if (!result.eligible) {
    return {
      ok: false,
      interaction: createIdleInteraction(result.issues)
    };
  }

  const destinationKey = coordinateKey(interaction.destination);
  if (
    !result.candidateDestinations.some(
      (candidate) => coordinateKey(candidate) === destinationKey
    )
  ) {
    return {
      ok: false,
      interaction: recoverSummonInteraction(
        state,
        interaction,
        validateSummonDestination(state, "player", interaction.destination)
      )
    };
  }

  return {
    ok: true,
    command: {
      type: "summonCreature",
      side: "player",
      handInstanceId: interaction.handInstanceId,
      destination: interaction.destination
    }
  };
}

export function recoverSummonInteraction(
  state: BattleState,
  interaction: BattleInteractionState,
  issues: readonly BattleValidationIssue[]
): BattleInteractionState {
  if (interaction.kind !== "selecting-summon") {
    return createIdleInteraction(issues);
  }

  const result = querySummonStart(state, "player", interaction.handInstanceId);
  if (!result.eligible) {
    return createIdleInteraction(issues.length > 0 ? issues : result.issues);
  }

  const candidateKeys = new Set(result.candidateDestinations.map(coordinateKey));
  const destination =
    interaction.destination && candidateKeys.has(coordinateKey(interaction.destination))
      ? interaction.destination
      : undefined;

  return {
    kind: "selecting-summon",
    handInstanceId: interaction.handInstanceId,
    candidateDestinations: result.candidateDestinations,
    destination,
    issue: firstIssue(issues)
  };
}

export function cancelBattleInteraction(): BattleInteractionState {
  return IDLE_BATTLE_INTERACTION;
}

export function guardEndPlayPhase(
  interaction: BattleInteractionState
): BattleInteractionState {
  if (interaction.kind === "idle") {
    return interaction;
  }

  return {
    ...interaction,
    issue: {
      code: "battle.interaction.pending",
      message: "Confirm or cancel the pending summon before ending the play phase."
    }
  };
}

export function isBattleInteractionPending(
  interaction: BattleInteractionState
): boolean {
  return interaction.kind !== "idle";
}

export function projectBattleInteractionView(
  interaction: BattleInteractionState,
  publicView: PublicBattleView
): BattleInteractionView {
  const endPlayPhaseEnabled =
    interaction.kind === "idle" &&
    publicView.phase === "play" &&
    publicView.activeSide === "player" &&
    !publicView.terminalResult;

  if (interaction.kind === "idle") {
    return {
      kind: "idle",
      candidateDestinationKeys: [],
      confirmEnabled: false,
      cancelEnabled: false,
      undoEnabled: false,
      endPlayPhaseEnabled,
      instruction: "Select an available creature from your hand.",
      issue: interaction.issue?.message
    };
  }

  const selectedCard = publicView.playerHand.find(
    (card) => card.instanceId === interaction.handInstanceId
  );

  return {
    kind: "selecting-summon",
    selectedHandInstanceId: interaction.handInstanceId,
    candidateDestinationKeys: interaction.candidateDestinations.map(coordinateKey),
    selectedDestinationKey: interaction.destination
      ? coordinateKey(interaction.destination)
      : undefined,
    selectedCardName: selectedCard?.name,
    selectedCardCost: selectedCard?.currentCost,
    confirmEnabled: Boolean(interaction.destination),
    cancelEnabled: true,
    undoEnabled: false,
    endPlayPhaseEnabled: false,
    instruction: interaction.destination
      ? "Confirm this summon or choose another highlighted destination."
      : "Choose a highlighted summon destination.",
    issue: interaction.issue?.message
  };
}

export function projectBattleInteractionFromState(
  interaction: BattleInteractionState,
  state: BattleState
): BattleInteractionView {
  return projectBattleInteractionView(interaction, projectPublicBattleView(state));
}

function createIdleInteraction(
  issues: readonly BattleValidationIssue[]
): BattleInteractionState {
  const issue = firstIssue(issues);
  return issue ? { kind: "idle", issue } : IDLE_BATTLE_INTERACTION;
}

function firstIssue(
  issues: readonly BattleValidationIssue[]
): BattleInteractionIssue | undefined {
  const issue = issues[0];
  return issue
    ? {
        code: issue.code,
        message: issue.message
      }
    : undefined;
}
