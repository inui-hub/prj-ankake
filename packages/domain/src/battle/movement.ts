import {
  coordinateKey,
  getAdjacentBoardCoordinates,
  getBoardSquare,
  getOccupantId,
  isExistingBoardCoordinate,
  isNormalBoardCoordinate,
  sameCoordinate
} from "./board";
import { getEffectiveCreatureMovement } from "./resonance";
import type {
  BattleCardInstance,
  BattleCardInstanceId,
  BattleSide,
  BattleState,
  BattleValidationIssue,
  BoardCoordinate,
  MovementDraftEvaluation,
  MovementStartResult
} from "./types";

export function queryMovementStart(
  state: BattleState,
  side: BattleSide,
  creatureInstanceId: BattleCardInstanceId
): MovementStartResult {
  const sourceIssues = validateMovementSource(state, side, creatureInstanceId);
  if (sourceIssues.length > 0) {
    return ineligible(creatureInstanceId, sourceIssues);
  }

  const card = state.cardInstances[creatureInstanceId] as BattleCardInstance;
  const origin = card.position as BoardCoordinate;
  const candidateNextSteps = getMovementCandidates(
    state,
    creatureInstanceId,
    origin,
    origin
  );
  if (candidateNextSteps.length === 0) {
    return ineligible(creatureInstanceId, [
      {
        code: "battle.move.no-destination",
        message: "No legal adjacent square is available for this creature.",
        path: "path"
      }
    ]);
  }

  return {
    eligible: true,
    creatureInstanceId,
    origin,
    maximumMovement: effectiveMovement(state, card),
    candidateNextSteps,
    issues: []
  };
}

export function evaluateMovementDraft(
  state: BattleState,
  side: BattleSide,
  creatureInstanceId: BattleCardInstanceId,
  expectedOrigin: BoardCoordinate,
  proposedPath: readonly BoardCoordinate[]
): MovementDraftEvaluation {
  const card = state.cardInstances[creatureInstanceId];
  const maximumMovement = card ? effectiveMovement(state, card) : 0;
  const sourceIssues = validateMovementSource(
    state,
    side,
    creatureInstanceId,
    expectedOrigin
  );
  if (sourceIssues.length > 0) {
    return {
      sourceEligible: false,
      creatureInstanceId,
      expectedOrigin,
      validPath: [],
      provisionalPosition: expectedOrigin,
      usedMovement: 0,
      maximumMovement,
      candidateNextSteps: [],
      issues: sourceIssues
    };
  }

  const validPath: BoardCoordinate[] = [];
  let provisionalPosition = expectedOrigin;
  let firstIssue: BattleValidationIssue | undefined;

  for (const [index, step] of proposedPath.entries()) {
    if (index >= maximumMovement) {
      firstIssue = {
        code: "battle.move.too-far",
        message: "The movement path is longer than this creature's movement.",
        path: `path.${index}`
      };
      break;
    }

    const stepIssue = validateMovementStep(
      state,
      creatureInstanceId,
      expectedOrigin,
      provisionalPosition,
      step,
      index
    );
    if (stepIssue) {
      firstIssue = stepIssue;
      break;
    }

    validPath.push(step);
    provisionalPosition = step;
  }

  const candidateNextSteps =
    validPath.length < maximumMovement
      ? getMovementCandidates(
          state,
          creatureInstanceId,
          expectedOrigin,
          provisionalPosition
        )
      : [];

  return {
    sourceEligible: true,
    creatureInstanceId,
    expectedOrigin,
    validPath,
    provisionalPosition,
    usedMovement: validPath.length,
    maximumMovement,
    candidateNextSteps,
    issues: firstIssue ? [firstIssue] : []
  };
}

function effectiveMovement(state: BattleState, card: BattleCardInstance): number {
  return getEffectiveCreatureMovement(state, card);
}

export function getNextMovementSteps(
  state: BattleState,
  side: BattleSide,
  creatureInstanceId: BattleCardInstanceId,
  expectedOrigin: BoardCoordinate,
  path: readonly BoardCoordinate[]
): readonly BoardCoordinate[] {
  return evaluateMovementDraft(
    state,
    side,
    creatureInstanceId,
    expectedOrigin,
    path
  ).candidateNextSteps;
}

export function validateMovementPath(
  state: BattleState,
  side: BattleSide,
  creatureInstanceId: BattleCardInstanceId,
  expectedOrigin: BoardCoordinate,
  path: readonly BoardCoordinate[]
): readonly BattleValidationIssue[] {
  const evaluation = evaluateMovementDraft(
    state,
    side,
    creatureInstanceId,
    expectedOrigin,
    path
  );
  if (!evaluation.sourceEligible || evaluation.issues.length > 0) {
    return evaluation.issues;
  }

  if (path.length === 0) {
    return [
      {
        code: "battle.move.path-invalid",
        message: "Movement requires at least one path step.",
        path: "path"
      }
    ];
  }

  return evaluation.validPath.length === path.length
    ? []
    : [
        {
          code: "battle.move.path-invalid",
          message: "The movement path is not currently legal.",
          path: `path.${evaluation.validPath.length}`
        }
      ];
}

export function validateMovementSource(
  state: BattleState,
  side: BattleSide,
  creatureInstanceId: BattleCardInstanceId,
  expectedOrigin?: BoardCoordinate
): readonly BattleValidationIssue[] {
  if (state.phase === "terminal" || state.terminalResult) {
    return [
      {
        code: "battle.terminal",
        message: "The battle has already ended."
      }
    ];
  }

  if (state.phase !== "play") {
    return [
      {
        code: "battle.phase.invalid",
        message: "Battle commands can be confirmed only during a play phase."
      }
    ];
  }

  if (state.activeSide !== side) {
    return [
      {
        code: "battle.side.inactive",
        message: "It is not this side's turn."
      }
    ];
  }

  const card = state.cardInstances[creatureInstanceId];
  if (!card) {
    return [
      {
        code: "battle.card.not-found",
        message: "The selected creature no longer exists.",
        path: "creatureInstanceId"
      }
    ];
  }

  if ((card.type !== "creature" && card.type !== "creature-token") || card.zone !== "board" || !card.position) {
    return [
      {
        code: "battle.card.zone-invalid",
        message: "Only creatures on the board can move.",
        path: "creatureInstanceId"
      }
    ];
  }

  if (card.controllerSide !== side) {
    return [
      {
        code: "battle.card.owner-invalid",
        message: "Only your own creatures can move.",
        path: "creatureInstanceId"
      }
    ];
  }

  if (expectedOrigin && !sameCoordinate(card.position, expectedOrigin)) {
    return [
      {
        code: "battle.move.origin-changed",
        message: "The selected creature is no longer at the expected origin.",
        path: "origin"
      }
    ];
  }

  if (card.summonedThisTurn || card.movedThisTurn) {
    return [
      {
        code: "battle.move.already-moved",
        message: card.summonedThisTurn
          ? "A creature cannot move on the turn it was summoned."
          : "This creature cannot move again this turn.",
        path: "creatureInstanceId"
      }
    ];
  }

  if (effectiveMovement(state, card) < 1) {
    return [
      {
        code: "battle.move.too-far",
        message: "This creature has no movement available.",
        path: "movement"
      }
    ];
  }

  return [];
}

export function getShortestMovementPaths(
  state: BattleState,
  side: BattleSide,
  creatureInstanceId: BattleCardInstanceId
): readonly (readonly BoardCoordinate[])[] {
  const start = queryMovementStart(state, side, creatureInstanceId);
  if (!start.eligible) {
    return [];
  }

  const visited = new Set([coordinateKey(start.origin)]);
  const paths: BoardCoordinate[][] = [];
  const queue: BoardCoordinate[][] = [[]];

  while (queue.length > 0) {
    const path = queue.shift() as BoardCoordinate[];
    if (path.length >= start.maximumMovement) {
      continue;
    }

    for (const candidate of getNextMovementSteps(
      state,
      side,
      creatureInstanceId,
      start.origin,
      path
    )) {
      const key = coordinateKey(candidate);
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      const nextPath = [...path, candidate];
      paths.push(nextPath);
      queue.push(nextPath);
    }
  }

  return paths;
}

function getMovementCandidates(
  state: BattleState,
  creatureInstanceId: BattleCardInstanceId,
  expectedOrigin: BoardCoordinate,
  provisionalPosition: BoardCoordinate
): readonly BoardCoordinate[] {
  return getAdjacentBoardCoordinates(provisionalPosition).filter((candidate) => {
    if (
      !isNormalBoardCoordinate(candidate) ||
      !getBoardSquare(state.board, candidate)
    ) {
      return false;
    }

    const occupantId = getOccupantId(state.board, candidate);
    return (
      !occupantId ||
      (occupantId === creatureInstanceId && sameCoordinate(candidate, expectedOrigin))
    );
  });
}

function validateMovementStep(
  state: BattleState,
  creatureInstanceId: BattleCardInstanceId,
  expectedOrigin: BoardCoordinate,
  from: BoardCoordinate,
  step: BoardCoordinate,
  index: number
): BattleValidationIssue | undefined {
  if (!isExistingBoardCoordinate(step) || !getBoardSquare(state.board, step)) {
    return {
      code: "battle.board.coordinate-invalid",
      message: "Movement paths must use existing board squares.",
      path: `path.${index}`
    };
  }

  if (
    !getAdjacentBoardCoordinates(from).some((candidate) =>
      sameCoordinate(candidate, step)
    )
  ) {
    return {
      code: "battle.move.path-invalid",
      message: "Movement paths must use adjacent board squares.",
      path: `path.${index}`
    };
  }

  if (!isNormalBoardCoordinate(step)) {
    return {
      code: "battle.board.destination-invalid",
      message: "Movement paths cannot enter base squares.",
      path: `path.${index}`
    };
  }

  const occupantId = getOccupantId(state.board, step);
  if (
    occupantId &&
    !(occupantId === creatureInstanceId && sameCoordinate(step, expectedOrigin))
  ) {
    return {
      code: "battle.board.occupied",
      message: "Movement paths cannot enter occupied squares.",
      path: `path.${index}`
    };
  }

  return undefined;
}

function ineligible(
  creatureInstanceId: BattleCardInstanceId,
  issues: readonly BattleValidationIssue[]
): MovementStartResult {
  return {
    eligible: false,
    creatureInstanceId,
    candidateNextSteps: [],
    issues
  };
}
