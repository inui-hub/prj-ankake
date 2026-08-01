import {
  BATTLE_BOARD_COLUMNS,
  BATTLE_BOARD_ROWS,
  CANONICAL_BOARD_COORDINATES,
  createBattleState,
  generateLegalActions,
  getTerrain,
  isExistingBoardCoordinate,
  isNormalBoardCoordinate,
  type BattleCommand,
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
