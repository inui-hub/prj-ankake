import { BATTLE_BOARD_COLUMNS, BATTLE_BOARD_ROWS } from "./constants";
import { getBoardSquare, getOccupantId, isSummonRow } from "./board";
import { validateBattleCommand } from "./validation";
import type { BattleCommand, BattleSide, BattleState, BoardCoordinate, LegalAction } from "./types";

export function generateLegalActions(state: BattleState, side: BattleSide): readonly LegalAction[] {
  if (state.phase !== "play" || state.activeSide !== side || state.terminalResult) {
    return [];
  }

  const actions: LegalAction[] = [];
  const player = state.players[side];

  for (const instanceId of player.handZone) {
    const card = state.cardInstances[instanceId];
    if (!card) {
      continue;
    }

    if (card.type === "creature") {
      for (const destination of getSummonDestinations(state, side)) {
        const command: BattleCommand = {
          type: "summonCreature",
          side,
          handInstanceId: instanceId,
          destination
        };
        if (validateBattleCommand(state, command).length === 0) {
          actions.push({
            command,
            label: `Summon ${card.name}`,
            scoreHint: card.currentAttack ?? 1
          });
        }
      }
    } else if (card.type === "spell") {
      const command: BattleCommand = {
        type: "castSpell",
        side,
        handInstanceId: instanceId
      };
      if (validateBattleCommand(state, command).length === 0) {
        actions.push({
          command,
          label: `Cast ${card.name}`,
          scoreHint: Math.max(1, card.currentCost)
        });
      }
    }
  }

  for (const card of Object.values(state.cardInstances)) {
    if (card.zone !== "board" || card.controllerSide !== side || !card.position) {
      continue;
    }

    for (const destination of getAdjacentEmptySquares(state, card.position)) {
      const command: BattleCommand = {
        type: "moveCreature",
        side,
        creatureInstanceId: card.instanceId,
        path: [destination]
      };
      if (validateBattleCommand(state, command).length === 0) {
        actions.push({
          command,
          label: `Move ${card.name}`,
          scoreHint: 1
        });
      }
    }
  }

  actions.push({
    command: {
      type: "endPlayPhase",
      side,
      reason: side === "cpu" ? "cpu" : "manual"
    },
    label: "End play phase",
    scoreHint: 0
  });

  return actions;
}

export function getSummonDestinations(
  state: BattleState,
  side: BattleSide
): readonly BoardCoordinate[] {
  const destinations: BoardCoordinate[] = [];

  for (let row = 1; row <= BATTLE_BOARD_ROWS; row += 1) {
    for (let column = 1; column <= BATTLE_BOARD_COLUMNS; column += 1) {
      const coordinate = { column, row };
      if (
        isSummonRow(side, coordinate) &&
        getBoardSquare(state.board, coordinate)?.terrain === "normal" &&
        !getOccupantId(state.board, coordinate)
      ) {
        destinations.push(coordinate);
      }
    }
  }

  return destinations;
}

function getAdjacentEmptySquares(
  state: BattleState,
  coordinate: BoardCoordinate
): readonly BoardCoordinate[] {
  const destinations: BoardCoordinate[] = [];

  for (let row = coordinate.row - 1; row <= coordinate.row + 1; row += 1) {
    for (let column = coordinate.column - 1; column <= coordinate.column + 1; column += 1) {
      if (row === coordinate.row && column === coordinate.column) {
        continue;
      }

      const destination = { column, row };
      const square = getBoardSquare(state.board, destination);
      if (square?.terrain === "normal" && !getOccupantId(state.board, destination)) {
        destinations.push(destination);
      }
    }
  }

  return destinations;
}
