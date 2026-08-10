import {
  coordinateKey,
  getBoardSquare,
  getAdjacentBoardCoordinates,
  getOccupantId,
  INITIAL_SUMMON_COORDINATES_BY_SIDE,
  isExistingBoardCoordinate,
  isNormalBoardCoordinate
} from "./board";
import { getOwnedNeutralBases } from "./bases";
import { getLane } from "./board";
import { getCreaturePlayCost } from "./resonance";
import type {
  BattleCardInstance,
  BattleCardInstanceId,
  BattleSide,
  BattleState,
  BattleValidationIssue,
  BoardCoordinate,
  SummonStartResult
} from "./types";

export function querySummonStart(
  state: BattleState,
  side: BattleSide,
  handInstanceId: BattleCardInstanceId
): SummonStartResult {
  const sourceIssues = validateSummonSource(state, side, handInstanceId);
  if (sourceIssues.length > 0) {
    return ineligible(handInstanceId, sourceIssues);
  }

  const candidateDestinations = collectSummonDestinations(state, side);
  const card = state.cardInstances[handInstanceId];
  const affordableDestinations = card
    ? candidateDestinations.filter((destination) => getCreaturePlayCost(state, side, card, getLane(destination.column)) <= state.players[side].currentPp)
    : [];
  if (affordableDestinations.length === 0) {
    if (candidateDestinations.length > 0) {
      return ineligible(handInstanceId, [{
        code: "battle.resource.pp-insufficient",
        message: "Not enough PP to play this creature.",
        path: "currentPp"
      }]);
    }
    return ineligible(handInstanceId, [
      {
        code: "battle.summon.no-destination",
        message: "No empty legal summon square is available.",
        path: "destination"
      }
    ]);
  }

  return {
    eligible: true,
    handInstanceId,
    candidateDestinations: affordableDestinations,
    issues: []
  };
}

export function getSummonDestinations(
  state: BattleState,
  side: BattleSide,
  handInstanceId: BattleCardInstanceId
): readonly BoardCoordinate[] {
  const result = querySummonStart(state, side, handInstanceId);
  return result.eligible ? result.candidateDestinations : [];
}

export function validateSummonSource(
  state: BattleState,
  side: BattleSide,
  handInstanceId: BattleCardInstanceId
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
        message: "Creatures can be summoned only during a play phase."
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

  const card = state.cardInstances[handInstanceId];
  if (!card) {
    return [
      {
        code: "battle.card.not-found",
        message: "The selected card no longer exists.",
        path: "handInstanceId"
      }
    ];
  }

  if (card.ownerSide !== side || !state.players[side].handZone.includes(card.instanceId)) {
    return [
      {
        code: "battle.card.owner-invalid",
        message: "The selected card is not in this side's hand.",
        path: "handInstanceId"
      }
    ];
  }

  if (card.zone !== "hand") {
    return [
      {
        code: "battle.card.zone-invalid",
        message: "The selected card is not in hand.",
        path: "handInstanceId"
      }
    ];
  }

  if (!isCreature(card)) {
    return [
      {
        code: "battle.card.type-invalid",
        message: "Only creature cards can be summoned.",
        path: "handInstanceId"
      }
    ];
  }

  return [];
}

export function validateSummonDestination(
  state: BattleState,
  side: BattleSide,
  destination: BoardCoordinate
): readonly BattleValidationIssue[] {
  if (!isExistingBoardCoordinate(destination) || !getBoardSquare(state.board, destination)) {
    return [
      {
        code: "battle.board.coordinate-invalid",
        message: "The selected square does not exist on the board.",
        path: "destination"
      }
    ];
  }

  if (!isNormalBoardCoordinate(destination)) {
    return [
      {
        code: "battle.board.destination-invalid",
        message: "Base squares cannot be used as summon destinations.",
        path: "destination"
      }
    ];
  }

  if (!getSummonRangeCoordinates(state, side).some((coordinate) => coordinateKey(coordinate) === coordinateKey(destination))) {
    return [
      {
        code: "battle.board.destination-invalid",
        message: "Creatures can be summoned only to a legal summon square.",
        path: "destination"
      }
    ];
  }

  if (getOccupantId(state.board, destination)) {
    return [
      {
        code: "battle.board.occupied",
        message: "The selected square is occupied.",
        path: "destination"
      }
    ];
  }

  return [];
}

function collectSummonDestinations(
  state: BattleState,
  side: BattleSide
): readonly BoardCoordinate[] {
  return getSummonRangeCoordinates(state, side).filter(
    (coordinate) => !getOccupantId(state.board, coordinate)
  );
}

export function getSummonRangeCoordinates(
  state: BattleState,
  side: BattleSide
): readonly BoardCoordinate[] {
  const seen = new Set<string>();
  const candidates = [
    ...INITIAL_SUMMON_COORDINATES_BY_SIDE[side],
    ...getOwnedNeutralBases(state.bases, side).flatMap((base) =>
      getAdjacentBoardCoordinates(base.coordinate)
    )
  ];

  return candidates.filter((coordinate) => {
    const key = coordinateKey(coordinate);
    if (
      seen.has(key) ||
      !isExistingBoardCoordinate(coordinate) ||
      !isNormalBoardCoordinate(coordinate)
    ) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isCreature(card: BattleCardInstance): boolean {
  return card.type === "creature" || card.type === "creature-token";
}

function ineligible(
  handInstanceId: BattleCardInstanceId,
  issues: readonly BattleValidationIssue[]
): SummonStartResult {
  return {
    eligible: false,
    handInstanceId,
    candidateDestinations: [],
    issues
  };
}
