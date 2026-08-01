import {
  coordinateKey,
  evaluateMovementDraft,
  projectPublicBattleView,
  queryMovementStart,
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
    }
  | {
      readonly kind: "selecting-move";
      readonly creatureInstanceId: string;
      readonly expectedOrigin: BoardCoordinate;
      readonly path: readonly BoardCoordinate[];
      readonly candidateNextSteps: readonly BoardCoordinate[];
      readonly maximumMovement: number;
      readonly issue?: BattleInteractionIssue;
    };

export interface MovementPathStepView {
  readonly key: string;
  readonly stepNumber: number;
}

export interface BattleInteractionView {
  readonly kind: BattleInteractionState["kind"];
  readonly selectedHandInstanceId?: string;
  readonly selectedCreatureInstanceId?: string;
  readonly candidateDestinationKeys: readonly string[];
  readonly selectedDestinationKey?: string;
  readonly selectedCardName?: string;
  readonly selectedCardCost?: number;
  readonly movementOriginKey?: string;
  readonly movementPathSteps: readonly MovementPathStepView[];
  readonly provisionalPositionKey?: string;
  readonly movementUsed?: number;
  readonly movementMaximum?: number;
  readonly confirmEnabled: boolean;
  readonly cancelEnabled: boolean;
  readonly undoEnabled: boolean;
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

export type MovementConfirmationPreparation =
  | {
      readonly ok: true;
      readonly command: Extract<BattleCommand, { type: "moveCreature" }>;
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
    return interaction.kind !== "idle"
      ? interaction
      : createIdleInteraction(result.issues);
  }

  return {
    kind: "selecting-summon",
    handInstanceId,
    candidateDestinations: result.candidateDestinations
  };
}

export function selectMovementCreature(
  interaction: BattleInteractionState,
  state: BattleState,
  creatureInstanceId: string
): BattleInteractionState {
  if (
    interaction.kind === "selecting-move" &&
    interaction.creatureInstanceId === creatureInstanceId
  ) {
    return IDLE_BATTLE_INTERACTION;
  }

  const result = queryMovementStart(state, "player", creatureInstanceId);
  if (!result.eligible) {
    return interaction.kind !== "idle"
      ? interaction
      : createIdleInteraction(result.issues);
  }

  return {
    kind: "selecting-move",
    creatureInstanceId,
    expectedOrigin: result.origin,
    path: [],
    candidateNextSteps: result.candidateNextSteps,
    maximumMovement: result.maximumMovement
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

export function selectMovementStep(
  interaction: BattleInteractionState,
  state: BattleState,
  destination: BoardCoordinate
): BattleInteractionState {
  if (interaction.kind !== "selecting-move") {
    return interaction;
  }

  const destinationKey = coordinateKey(destination);
  const candidate = interaction.candidateNextSteps.find(
    (coordinate) => coordinateKey(coordinate) === destinationKey
  );
  if (!candidate) {
    return interaction;
  }

  const evaluation = evaluateMovementDraft(
    state,
    "player",
    interaction.creatureInstanceId,
    interaction.expectedOrigin,
    [...interaction.path, candidate]
  );

  return {
    kind: "selecting-move",
    creatureInstanceId: interaction.creatureInstanceId,
    expectedOrigin: interaction.expectedOrigin,
    path: evaluation.validPath,
    candidateNextSteps: evaluation.candidateNextSteps,
    maximumMovement: evaluation.maximumMovement,
    issue: firstIssue(evaluation.issues)
  };
}

export function undoMovementStep(
  interaction: BattleInteractionState,
  state: BattleState
): BattleInteractionState {
  if (interaction.kind !== "selecting-move" || interaction.path.length === 0) {
    return interaction;
  }

  return recoverMovementInteraction(
    state,
    {
      ...interaction,
      path: interaction.path.slice(0, -1)
    },
    []
  );
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

export function prepareMovementConfirmation(
  interaction: BattleInteractionState,
  state: BattleState
): MovementConfirmationPreparation {
  if (interaction.kind !== "selecting-move" || interaction.path.length === 0) {
    return { ok: false, interaction };
  }

  const evaluation = evaluateMovementDraft(
    state,
    "player",
    interaction.creatureInstanceId,
    interaction.expectedOrigin,
    interaction.path
  );
  if (
    !evaluation.sourceEligible ||
    evaluation.issues.length > 0 ||
    evaluation.validPath.length !== interaction.path.length
  ) {
    return {
      ok: false,
      interaction: recoverMovementInteraction(
        state,
        interaction,
        evaluation.issues
      )
    };
  }

  return {
    ok: true,
    command: {
      type: "moveCreature",
      side: "player",
      creatureInstanceId: interaction.creatureInstanceId,
      origin: interaction.expectedOrigin,
      path: interaction.path
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

export function recoverMovementInteraction(
  state: BattleState,
  interaction: BattleInteractionState,
  issues: readonly BattleValidationIssue[]
): BattleInteractionState {
  if (interaction.kind !== "selecting-move") {
    return createIdleInteraction(issues);
  }

  const evaluation = evaluateMovementDraft(
    state,
    "player",
    interaction.creatureInstanceId,
    interaction.expectedOrigin,
    interaction.path
  );
  if (!evaluation.sourceEligible) {
    return createIdleInteraction(
      issues.length > 0 ? issues : evaluation.issues
    );
  }

  return {
    kind: "selecting-move",
    creatureInstanceId: interaction.creatureInstanceId,
    expectedOrigin: interaction.expectedOrigin,
    path: evaluation.validPath,
    candidateNextSteps: evaluation.candidateNextSteps,
    maximumMovement: evaluation.maximumMovement,
    issue: firstIssue(issues.length > 0 ? issues : evaluation.issues)
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
      message: "Confirm or cancel the pending action before ending the play phase."
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
      movementPathSteps: [],
      confirmEnabled: false,
      cancelEnabled: false,
      undoEnabled: false,
      endPlayPhaseEnabled,
      instruction: "Select an available creature from your hand.",
      issue: interaction.issue?.message
    };
  }

  if (interaction.kind === "selecting-move") {
    const selectedCard = publicView.boardSquares
      .map((square) => square.occupant)
      .find((card) => card?.instanceId === interaction.creatureInstanceId);
    const provisionalPosition =
      interaction.path[interaction.path.length - 1] ?? interaction.expectedOrigin;

    return {
      kind: "selecting-move",
      selectedCreatureInstanceId: interaction.creatureInstanceId,
      candidateDestinationKeys: interaction.candidateNextSteps.map(coordinateKey),
      selectedCardName: selectedCard?.name,
      movementOriginKey: coordinateKey(interaction.expectedOrigin),
      movementPathSteps: interaction.path.map((coordinate, index) => ({
        key: coordinateKey(coordinate),
        stepNumber: index + 1
      })),
      provisionalPositionKey: coordinateKey(provisionalPosition),
      movementUsed: interaction.path.length,
      movementMaximum: interaction.maximumMovement,
      confirmEnabled: interaction.path.length > 0,
      cancelEnabled: true,
      undoEnabled: interaction.path.length > 0,
      endPlayPhaseEnabled: false,
      instruction:
        interaction.path.length > 0
          ? "Continue moving, undo the last step, or confirm this path."
          : "Choose a highlighted movement destination.",
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
    movementPathSteps: [],
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
