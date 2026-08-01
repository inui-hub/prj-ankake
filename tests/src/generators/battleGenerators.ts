import {
  BATTLE_BOARD_COLUMNS,
  BATTLE_BOARD_ROWS,
  CANONICAL_BOARD_COORDINATES,
  INITIAL_SUMMON_COORDINATES_BY_SIDE,
  createBattleState,
  createInitialBattleBoard,
  generateLegalActions,
  getTerrain,
  isExistingBoardCoordinate,
  isInitialSummonCoordinate,
  isNormalBoardCoordinate,
  setBoardOccupant,
  type BattleCardInstance,
  type BattleCommand,
  type BattleSide,
  type BattleSetupInput,
  type BattleState,
  type BoardCoordinate,
  type FirstPlayerMode,
  type SavedDeck
} from "@ankake/domain";
import fc from "fast-check";
import { battleReadyDeckCardsArbitrary, deckIdArbitrary, deckNameArbitrary } from "./deckGenerators";
import { validCatalogSnapshotFixture } from "./catalogGenerators";

const BASE_TIMESTAMP = "2026-07-25T00:00:00.000Z";

export const boardCoordinateArbitrary: fc.Arbitrary<BoardCoordinate> = fc.record({
  column: fc.integer({ min: 1, max: BATTLE_BOARD_COLUMNS }),
  row: fc.integer({ min: 1, max: BATTLE_BOARD_ROWS })
});

export const canonicalBoardCoordinateArbitrary: fc.Arbitrary<BoardCoordinate> =
  fc.constantFrom(...CANONICAL_BOARD_COORDINATES);

export const normalBoardCoordinateArbitrary: fc.Arbitrary<BoardCoordinate> =
  fc.constantFrom(
    ...CANONICAL_BOARD_COORDINATES.filter(isNormalBoardCoordinate)
  );

export const baseBoardCoordinateArbitrary: fc.Arbitrary<BoardCoordinate> =
  fc.constantFrom(
    ...CANONICAL_BOARD_COORDINATES.filter(
      (coordinate) => getTerrain(coordinate) !== "normal"
    )
  );

export const absentBoardCoordinateArbitrary: fc.Arbitrary<BoardCoordinate> =
  boardCoordinateArbitrary.filter(
    (coordinate) => !isExistingBoardCoordinate(coordinate)
  );

export const initialSummonCoordinateArbitrary: fc.Arbitrary<{
  readonly side: BattleSide;
  readonly coordinate: BoardCoordinate;
}> = fc.constantFrom(
  ...(["player", "cpu"] as const).flatMap((side) =>
    INITIAL_SUMMON_COORDINATES_BY_SIDE[side].map((coordinate) => ({ side, coordinate }))
  )
);

export const invalidSummonDestinationArbitrary: fc.Arbitrary<{
  readonly side: BattleSide;
  readonly destination: BoardCoordinate;
}> = fc.constantFrom<BattleSide>("player", "cpu").chain((side) =>
  fc
    .oneof(
      fc.constantFrom(
        ...CANONICAL_BOARD_COORDINATES.filter(
          (coordinate) => !isInitialSummonCoordinate(side, coordinate)
        )
      ),
      absentBoardCoordinateArbitrary,
      fc.oneof(
        fc.record({
          column: fc.integer({ min: -5, max: 0 }),
          row: fc.integer({ min: 1, max: BATTLE_BOARD_ROWS })
        }),
        fc.record({
          column: fc.integer({ min: BATTLE_BOARD_COLUMNS + 1, max: BATTLE_BOARD_COLUMNS + 5 }),
          row: fc.integer({ min: 1, max: BATTLE_BOARD_ROWS })
        })
      )
    )
    .map((destination) => ({ side, destination }))
);

export const firstPlayerModeArbitrary: fc.Arbitrary<FirstPlayerMode> = fc.constantFrom(
  "random",
  "player-first",
  "player-second"
);

export const battleReadySavedDeckArbitrary: fc.Arbitrary<SavedDeck> = fc
  .tuple(deckIdArbitrary, deckNameArbitrary, battleReadyDeckCardsArbitrary, fc.integer({ min: 0, max: 500 }))
  .map(([deckId, name, cards, minutes]) => ({
    deckId,
    name,
    cards,
    createdAt: timestampPlus(minutes),
    updatedAt: timestampPlus(minutes + 1)
  }));

export const battleSetupInputArbitrary: fc.Arbitrary<BattleSetupInput> = fc.record({
  playerDeck: battleReadySavedDeckArbitrary,
  cpuDeck: battleReadySavedDeckArbitrary,
  firstPlayerMode: firstPlayerModeArbitrary,
  catalog: fc.constant(validCatalogSnapshotFixture),
  seed: fc.string({ minLength: 1, maxLength: 24 }),
  now: fc.constant(BASE_TIMESTAMP)
});

export const battleStateArbitrary: fc.Arbitrary<BattleState> = battleSetupInputArbitrary.map((input) => {
  const result = createBattleState(input);
  if (!result.ok) {
    throw new Error("Battle generator produced invalid setup.");
  }

  return result.state;
});

export interface EligibleHandCreatureFixture {
  readonly state: BattleState;
  readonly side: BattleSide;
  readonly handInstanceId: string;
}

export const eligibleHandCreatureStateArbitrary: fc.Arbitrary<EligibleHandCreatureFixture> = fc
  .tuple(battleStateArbitrary, fc.constantFrom<BattleSide>("player", "cpu"))
  .map(([state, side]) => createEligibleHandCreatureFixture(state, side));

export const occupiedInitialSummonStateArbitrary: fc.Arbitrary<
  EligibleHandCreatureFixture & {
    readonly occupiedCoordinates: readonly BoardCoordinate[];
  }
> = eligibleHandCreatureStateArbitrary.chain((fixture) =>
  fc
    .uniqueArray(fc.constantFrom(...INITIAL_SUMMON_COORDINATES_BY_SIDE[fixture.side]), {
      minLength: 0,
      maxLength: INITIAL_SUMMON_COORDINATES_BY_SIDE[fixture.side].length,
      selector: (coordinate) => `${coordinate.column}:${coordinate.row}`
    })
    .map((occupiedCoordinates) => ({
      ...fixture,
      occupiedCoordinates,
      state: {
        ...fixture.state,
        board: occupiedCoordinates.reduce(
          (board, coordinate, index) =>
            setBoardOccupant(board, coordinate, `generated-blocker-${index}`),
          fixture.state.board
        )
      }
    }))
);

export const invalidSummonCommandArbitrary: fc.Arbitrary<{
  readonly state: BattleState;
  readonly command: Extract<BattleCommand, { type: "summonCreature" }>;
}> = eligibleHandCreatureStateArbitrary.chain((fixture) =>
  invalidSummonDestinationArbitrary
    .filter((input) => input.side === fixture.side)
    .map(({ destination }) => ({
      state: fixture.state,
      command: {
        type: "summonCreature" as const,
        side: fixture.side,
        handInstanceId: fixture.handInstanceId,
        destination
      }
    }))
);

export const legalBattleCommandArbitrary: fc.Arbitrary<{
  readonly state: BattleState;
  readonly command: BattleCommand;
}> = battleStateArbitrary
  .map((state) => ({
    state,
    actions: generateLegalActions(state, state.activeSide)
  }))
  .filter((input) => input.actions.length > 0)
  .chain((input) =>
    fc.constantFrom(...input.actions).map((action) => ({
      state: input.state,
      command: action.command
    }))
  );

function timestampPlus(minutes: number): string {
  return new Date(Date.parse(BASE_TIMESTAMP) + minutes * 60_000).toISOString();
}

function createEligibleHandCreatureFixture(
  state: BattleState,
  side: BattleSide
): EligibleHandCreatureFixture {
  const card = Object.values(state.cardInstances).find(
    (instance) => instance.ownerSide === side
  );

  if (!card) {
    throw new Error(`Expected a ${side} card fixture.`);
  }

  const creature: BattleCardInstance = {
    ...card,
    type: "creature",
    zone: "hand",
    position: undefined,
    currentCost: Math.min(2, card.currentCost),
    attack: card.attack ?? 2,
    currentAttack: card.currentAttack ?? card.attack ?? 2,
    health: card.health ?? 3,
    currentHp: card.currentHp ?? card.health ?? 3,
    maxHp: card.maxHp ?? card.health ?? 3,
    movement: Math.max(1, card.movement),
    summonedThisTurn: false,
    movedThisTurn: false
  };
  const player = state.players[side];

  return {
    side,
    handInstanceId: creature.instanceId,
    state: {
      ...state,
      phase: "play",
      activeSide: side,
      terminalResult: undefined,
      board: createInitialBattleBoard(),
      players: {
        ...state.players,
        [side]: {
          ...player,
          handZone: [creature.instanceId],
          deckZone: player.deckZone.filter((id) => id !== creature.instanceId),
          graveyardZone: player.graveyardZone.filter((id) => id !== creature.instanceId),
          currentPp: 10,
          maxPp: 10
        }
      },
      cardInstances: {
        ...state.cardInstances,
        [creature.instanceId]: creature
      }
    }
  };
}
