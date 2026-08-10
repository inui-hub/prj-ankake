import {
  BATTLE_BOARD_COLUMNS,
  BATTLE_BOARD_ROWS,
  CANONICAL_BOARD_COORDINATES,
  INITIAL_SUMMON_COORDINATES_BY_SIDE,
  coordinateKey,
  createBattleState,
  createInitialBattleBases,
  createInitialBattleBoard,
  generateLegalActions,
  getShortestMovementPaths,
  getTerrain,
  isExistingBoardCoordinate,
  isInitialSummonCoordinate,
  isNormalBoardCoordinate,
  placeCreatureForTest,
  setBoardOccupant,
  snapshotAttackTargets,
  updateBattleBase,
  type AttackTargetSnapshot,
  type BattleBaseOwner,
  type BattleBaseStateMap,
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

const neutralBaseOwnerArbitrary: fc.Arbitrary<BattleBaseOwner> = fc.constantFrom(
  "none",
  "player",
  "cpu"
);

export const validBattleBaseStateMapArbitrary: fc.Arbitrary<BattleBaseStateMap> =
  fc
    .record({
      cpuHp: fc.integer({ min: 0, max: 20 }),
      playerHp: fc.integer({ min: 0, max: 20 }),
      neutralLeft: fc.record({
        owner: neutralBaseOwnerArbitrary,
        currentHp: fc.integer({ min: 0, max: 10 })
      }),
      neutralCenter: fc.record({
        owner: neutralBaseOwnerArbitrary,
        currentHp: fc.integer({ min: 0, max: 20 })
      }),
      neutralRight: fc.record({
        owner: neutralBaseOwnerArbitrary,
        currentHp: fc.integer({ min: 0, max: 10 })
      })
    })
    .map((generated) => {
      let bases = createInitialBattleBases();
      bases = updateBattleBase(bases, "cpu-base", (base) => ({
        ...base,
        currentHp: generated.cpuHp
      }));
      bases = updateBattleBase(bases, "player-base", (base) => ({
        ...base,
        currentHp: generated.playerHp
      }));
      bases = updateBattleBase(bases, "neutral-left", (base) => ({
        ...base,
        ...generated.neutralLeft
      }));
      bases = updateBattleBase(bases, "neutral-center", (base) => ({
        ...base,
        ...generated.neutralCenter
      }));
      return updateBattleBase(bases, "neutral-right", (base) => ({
        ...base,
        ...generated.neutralRight
      }));
    });

export const battleStateWithBaseStateArbitrary: fc.Arbitrary<BattleState> =
  fc.tuple(battleStateArbitrary, validBattleBaseStateMapArbitrary).map(([state, bases]) => ({
    ...state,
    bases
  }));

export const battleStateWithBoardEntriesArbitrary: fc.Arbitrary<BattleState> =
  battleStateArbitrary.chain((state) => {
    const handIds = [
      ...state.players.player.handZone,
      ...state.players.cpu.handZone
    ];
    const coordinates = [
      { column: 4, row: 5 },
      { column: 5, row: 5 },
      { column: 7, row: 5 },
      { column: 8, row: 5 }
    ] as const;

    return fc.integer({ min: 0, max: coordinates.length }).map((count) =>
      handIds.slice(0, count).reduce((current, instanceId, index) => {
        const card = current.cardInstances[instanceId];
        const coordinate = coordinates[index];
        if (!card || !coordinate) {
          return current;
        }
        return placeCreatureForTest(
          current,
          instanceId,
          card.ownerSide,
          coordinate.column,
          coordinate.row
        );
      }, state)
    );
  });

export interface AttackResolutionFixture {
  readonly state: BattleState;
  readonly side: BattleSide;
  readonly attackerId: string;
  readonly attackerIds: readonly [string, string];
  readonly enemyIds: readonly [string, string];
}

export const attackResolutionStateArbitrary: fc.Arbitrary<AttackResolutionFixture> =
  battleStateArbitrary.chain((state) =>
    fc
      .record({
        attack: fc.integer({ min: 1, max: 8 }),
        firstEnemyHp: fc.integer({ min: 1, max: 10 }),
        secondEnemyHp: fc.integer({ min: 1, max: 10 })
      })
      .map(({ attack, firstEnemyHp, secondEnemyHp }) =>
        createAttackResolutionFixture(state, attack, firstEnemyHp, secondEnemyHp)
      )
  );

export const mixedAttackTargetStateArbitrary = attackResolutionStateArbitrary;

export const lethalCreatureAttackStateArbitrary: fc.Arbitrary<AttackResolutionFixture> =
  attackResolutionStateArbitrary.map((fixture) => {
    const attacker = fixture.state.cardInstances[fixture.attackerId]!;
    const targetId = fixture.enemyIds[0];
    const target = fixture.state.cardInstances[targetId]!;
    const lethalHp = Math.max(1, Math.min(target.currentHp ?? 1, attacker.currentAttack ?? 1));
    return {
      ...fixture,
      state: replaceCard(fixture.state, targetId, {
        ...target,
        currentHp: lethalHp,
        maxHp: Math.max(lethalHp, target.maxHp ?? lethalHp),
        health: Math.max(lethalHp, target.health ?? lethalHp)
      })
    };
  });

export const neutralCaptureStateArbitrary: fc.Arbitrary<AttackResolutionFixture> =
  fc.tuple(
    attackResolutionStateArbitrary,
    fc.constantFrom<BattleBaseOwner>("none", "cpu")
  ).map(([fixture, owner]) => {
    const damage = fixture.state.cardInstances[fixture.attackerId]?.currentAttack ?? 1;
    return {
      ...fixture,
      state: {
        ...fixture.state,
        bases: updateBattleBase(fixture.state.bases, "neutral-center", (base) => ({
          ...base,
          owner,
          currentHp: Math.max(1, Math.min(base.maxHp, damage))
        }))
      }
    };
  });

export const neutralVictoryStateArbitrary: fc.Arbitrary<AttackResolutionFixture> =
  neutralCaptureStateArbitrary.map((fixture) => {
    let bases = updateBattleBase(fixture.state.bases, "neutral-left", (base) => ({
      ...base,
      owner: fixture.side,
      currentHp: base.maxHp
    }));
    bases = updateBattleBase(bases, "neutral-right", (base) => ({
      ...base,
      owner: fixture.side,
      currentHp: base.maxHp
    }));
    return { ...fixture, state: { ...fixture.state, bases } };
  });

export const nonterminalAttackStateArbitrary: fc.Arbitrary<AttackResolutionFixture> =
  attackResolutionStateArbitrary.map((fixture) => ({
    ...fixture,
    state: {
      ...fixture.state,
      terminalResult: undefined,
      bases: createInitialBattleBases()
    }
  }));

export interface StaleAttackTargetFixture extends AttackResolutionFixture {
  readonly snapshot: AttackTargetSnapshot;
  readonly staleTargetId: string;
}

export const staleAttackTargetStateArbitrary: fc.Arbitrary<StaleAttackTargetFixture> =
  attackResolutionStateArbitrary.map((fixture) => {
    const staleTargetId = fixture.enemyIds[0];
    const target = fixture.state.cardInstances[staleTargetId]!;
    const snapshot = snapshotAttackTargets(fixture.state, fixture.attackerId);
    const board = target.position
      ? setBoardOccupant(fixture.state.board, target.position, undefined)
      : fixture.state.board;
    return {
      ...fixture,
      snapshot,
      staleTargetId,
      state: replaceCard(
        { ...fixture.state, board },
        staleTargetId,
        { ...target, zone: "graveyard", position: undefined, boardEntrySequence: undefined }
      )
    };
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

export interface MovableCreatureFixture {
  readonly state: BattleState;
  readonly side: BattleSide;
  readonly creatureInstanceId: string;
  readonly origin: BoardCoordinate;
  readonly maximumMovement: number;
  readonly occupiedCoordinates: readonly BoardCoordinate[];
}

export const movableCreatureStateArbitrary: fc.Arbitrary<MovableCreatureFixture> =
  eligibleHandCreatureStateArbitrary.chain((fixture) =>
    normalBoardCoordinateArbitrary.chain((origin) =>
      fc
        .record({
          maximumMovement: fc.integer({ min: 1, max: 4 }),
          occupiedCoordinates: fc.uniqueArray(
            normalBoardCoordinateArbitrary.filter(
              (coordinate) => coordinateKey(coordinate) !== coordinateKey(origin)
            ),
            {
              minLength: 0,
              maxLength: 8,
              selector: coordinateKey
            }
          )
        })
        .map(({ maximumMovement, occupiedCoordinates }) => {
          const placed = placeCreatureForTest(
            fixture.state,
            fixture.handInstanceId,
            fixture.side,
            origin.column,
            origin.row
          );
          const board = occupiedCoordinates.reduce(
            (current, coordinate, index) =>
              setBoardOccupant(current, coordinate, `movement-blocker-${index}`),
            placed.board
          );

          return {
            side: fixture.side,
            creatureInstanceId: fixture.handInstanceId,
            origin,
            maximumMovement,
            occupiedCoordinates,
            state: {
              ...placed,
              board,
              cardInstances: {
                ...placed.cardInstances,
                [fixture.handInstanceId]: {
                  ...placed.cardInstances[fixture.handInstanceId]!,
                  type: "creature",
                  movement: maximumMovement,
                  summonedThisTurn: false,
                  movedThisTurn: false
                }
              }
            }
          };
        })
    )
  );

export interface MovementPathFixture extends MovableCreatureFixture {
  readonly path: readonly BoardCoordinate[];
}

export const validMovementPathArbitrary: fc.Arbitrary<MovementPathFixture> =
  movableCreatureStateArbitrary
    .map((fixture) => ({
      fixture,
      paths: getShortestMovementPaths(
        fixture.state,
        fixture.side,
        fixture.creatureInstanceId
      )
    }))
    .filter(({ paths }) => paths.length > 0)
    .chain(({ fixture, paths }) =>
      fc.constantFrom(...paths).map((path) => ({ ...fixture, path }))
    );

export const invalidMovementSuffixArbitrary: fc.Arbitrary<
  MovementPathFixture & { readonly invalidStep: BoardCoordinate }
> = fc.tuple(
  validMovementPathArbitrary,
  fc.record({
    column: fc.integer({ min: BATTLE_BOARD_COLUMNS + 1, max: BATTLE_BOARD_COLUMNS + 5 }),
    row: fc.integer({ min: 1, max: BATTLE_BOARD_ROWS })
  })
).map(([fixture, invalidStep]) => ({ ...fixture, invalidStep }));

export const originReturnMovementArbitrary: fc.Arbitrary<MovementPathFixture> =
  movableCreatureStateArbitrary
    .filter((fixture) => fixture.maximumMovement >= 2)
    .map((fixture) => ({
      fixture,
      paths: getShortestMovementPaths(
        fixture.state,
        fixture.side,
        fixture.creatureInstanceId
      ).filter((path) => path.length === 1)
    }))
    .filter(({ paths }) => paths.length > 0)
    .chain(({ fixture, paths }) =>
      fc.constantFrom(...paths).map((path) => ({
        ...fixture,
        path: [path[0]!, fixture.origin]
      }))
    );

export interface ReachableMovementEndpointFixture extends MovementPathFixture {
  readonly endpoint: BoardCoordinate;
}

export const reachableMovementEndpointArbitrary: fc.Arbitrary<ReachableMovementEndpointFixture> =
  validMovementPathArbitrary.map((fixture) => ({
    ...fixture,
    endpoint: fixture.path[fixture.path.length - 1]!
  }));

function createAttackResolutionFixture(
  state: BattleState,
  attack: number,
  firstEnemyHp: number,
  secondEnemyHp: number
): AttackResolutionFixture {
  const attackerIds = Object.values(state.cardInstances)
    .filter((card) => card.ownerSide === "player")
    .slice(0, 2)
    .map((card) => card.instanceId);
  const enemyIds = Object.values(state.cardInstances)
    .filter((card) => card.ownerSide === "cpu")
    .slice(0, 2)
    .map((card) => card.instanceId);
  if (!attackerIds[0] || !attackerIds[1] || !enemyIds[0] || !enemyIds[1]) {
    throw new Error("Expected attack generator cards for both sides.");
  }

  let prepared: BattleState = {
    ...state,
    phase: "automatic",
    activeSide: "player",
    board: createInitialBattleBoard(),
    bases: createInitialBattleBases(),
    terminalResult: undefined
  };
  prepared = placeCreatureForTest(prepared, attackerIds[0], "player", 6, 4);
  prepared = placeCreatureForTest(prepared, attackerIds[1], "player", 4, 4);
  prepared = placeCreatureForTest(prepared, enemyIds[0], "cpu", 5, 4);
  prepared = placeCreatureForTest(prepared, enemyIds[1], "cpu", 7, 4);
  prepared = replaceCard(
    prepared,
    attackerIds[0],
    createGeneratedCreature(prepared.cardInstances[attackerIds[0]]!, "player", attack, 10)
  );
  prepared = replaceCard(
    prepared,
    attackerIds[1],
    createGeneratedCreature(prepared.cardInstances[attackerIds[1]]!, "player", attack, 10)
  );
  prepared = replaceCard(
    prepared,
    enemyIds[0],
    createGeneratedCreature(prepared.cardInstances[enemyIds[0]]!, "cpu", 2, firstEnemyHp)
  );
  prepared = replaceCard(
    prepared,
    enemyIds[1],
    createGeneratedCreature(prepared.cardInstances[enemyIds[1]]!, "cpu", 2, secondEnemyHp)
  );

  return {
    state: prepared,
    side: "player",
    attackerId: attackerIds[0],
    attackerIds: [attackerIds[0], attackerIds[1]],
    enemyIds: [enemyIds[0], enemyIds[1]]
  };
}

function createGeneratedCreature(
  card: BattleCardInstance,
  controllerSide: BattleSide,
  attack: number,
  hp: number
): BattleCardInstance {
  return {
    ...card,
    type: "creature",
    controllerSide,
    attack,
    currentAttack: attack,
    health: hp,
    currentHp: hp,
    maxHp: hp,
    summonedThisTurn: true,
    movedThisTurn: false
  };
}

function replaceCard(
  state: BattleState,
  instanceId: string,
  card: BattleCardInstance
): BattleState {
  return {
    ...state,
    cardInstances: {
      ...state.cardInstances,
      [instanceId]: card
    }
  };
}

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
