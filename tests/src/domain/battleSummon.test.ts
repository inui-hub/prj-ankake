import {
  INITIAL_SUMMON_COORDINATES_BY_SIDE,
  coordinateKey,
  createInitialBattleBoard,
  getSummonDestinations,
  projectPublicBattleView,
  querySummonStart,
  setBoardOccupant,
  validateSummonDestination,
  type BattleCardInstance,
  type BattleSide,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

const INITIAL_SUMMON_COLUMNS = [3, 4, 5, 7, 8, 9] as const;

describe("battle summon queries", () => {
  it.each([
    ["player", 9],
    ["cpu", 1]
  ] as const)("returns the exact ordered %s initial summon squares", (side, row) => {
    const { state, creatureId } = createSummonState(side);
    const result = querySummonStart(state, side, creatureId);
    const expected = INITIAL_SUMMON_COLUMNS.map((column) => `${column}:${row}`);

    expect(result.eligible).toBe(true);
    expect(result.candidateDestinations.map(coordinateKey)).toEqual(expected);
    expect(getSummonDestinations(state, side, creatureId).map(coordinateKey)).toEqual(expected);
    expect(INITIAL_SUMMON_COORDINATES_BY_SIDE[side].map(coordinateKey)).toEqual(expected);
  });

  it("returns stable source issues for unavailable cards", () => {
    const { state, creatureId } = createSummonState("player");
    const card = state.cardInstances[creatureId] as BattleCardInstance;
    const cases = [
      {
        label: "terminal",
        state: {
          ...state,
          phase: "terminal" as const,
          terminalResult: {
            winner: "cpu" as const,
            loser: "player" as const,
            reason: "base-destroyed" as const,
            turnNumber: 1,
            elapsedSeconds: 0,
            finalEventSequence: state.eventCursor
          }
        },
        cardId: creatureId,
        code: "battle.terminal"
      },
      {
        label: "phase",
        state: { ...state, phase: "automatic" as const },
        cardId: creatureId,
        code: "battle.phase.invalid"
      },
      {
        label: "side",
        state: { ...state, activeSide: "cpu" as const },
        cardId: creatureId,
        code: "battle.side.inactive"
      },
      {
        label: "missing card",
        state,
        cardId: "missing-card",
        code: "battle.card.not-found"
      },
      {
        label: "hand membership",
        state: {
          ...state,
          players: {
            ...state.players,
            player: { ...state.players.player, handZone: [] }
          }
        },
        cardId: creatureId,
        code: "battle.card.owner-invalid"
      },
      {
        label: "zone",
        state: {
          ...state,
          cardInstances: {
            ...state.cardInstances,
            [creatureId]: { ...card, zone: "board" as const }
          }
        },
        cardId: creatureId,
        code: "battle.card.zone-invalid"
      },
      {
        label: "type",
        state: {
          ...state,
          cardInstances: {
            ...state.cardInstances,
            [creatureId]: { ...card, type: "spell" as const }
          }
        },
        cardId: creatureId,
        code: "battle.card.type-invalid"
      },
      {
        label: "PP",
        state: {
          ...state,
          players: {
            ...state.players,
            player: { ...state.players.player, currentPp: 1 }
          }
        },
        cardId: creatureId,
        code: "battle.resource.pp-insufficient"
      }
    ];

    for (const entry of cases) {
      const result = querySummonStart(entry.state, "player", entry.cardId);
      expect(result.eligible, entry.label).toBe(false);
      expect(result.issues.map((issue) => issue.code), entry.label).toEqual([entry.code]);
      expect(result.candidateDestinations, entry.label).toEqual([]);
    }
  });

  it("excludes occupied candidates and reports a stable issue when all six are occupied", () => {
    const { state, creatureId } = createSummonState("player");
    const first = INITIAL_SUMMON_COORDINATES_BY_SIDE.player[0];
    const partlyOccupied = {
      ...state,
      board: setBoardOccupant(state.board, first, "blocking-creature")
    };

    expect(getSummonDestinations(partlyOccupied, "player", creatureId).map(coordinateKey)).toEqual(
      ["4:9", "5:9", "7:9", "8:9", "9:9"]
    );

    const fullyOccupied = INITIAL_SUMMON_COORDINATES_BY_SIDE.player.reduce(
      (current, coordinate, index) =>
        setBoardOccupant(current, coordinate, `blocking-creature-${index}`),
      state.board
    );
    const result = querySummonStart({ ...state, board: fullyOccupied }, "player", creatureId);

    expect(result.eligible).toBe(false);
    expect(result.candidateDestinations).toEqual([]);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "battle.summon.no-destination"
    ]);
  });

  it("distinguishes occupied, base, absent, and out-of-range destinations", () => {
    const { state } = createSummonState("player");
    const occupied = {
      ...state,
      board: setBoardOccupant(state.board, { column: 3, row: 9 }, "blocking-creature")
    };

    expect(validateSummonDestination(occupied, "player", { column: 3, row: 9 })[0]?.code).toBe(
      "battle.board.occupied"
    );
    expect(validateSummonDestination(state, "player", { column: 6, row: 9 })[0]?.code).toBe(
      "battle.board.destination-invalid"
    );
    expect(validateSummonDestination(state, "player", { column: 4, row: 8 })[0]?.code).toBe(
      "battle.board.coordinate-invalid"
    );
    expect(validateSummonDestination(state, "player", { column: 99, row: 99 })[0]?.code).toBe(
      "battle.board.coordinate-invalid"
    );
  });

  it("projects eligible creatures as actionable and keeps spells deferred", () => {
    const { state, creatureId } = createSummonState("player");
    const creatureView = projectPublicBattleView(state).playerHand[0];
    const spellState: BattleState = {
      ...state,
      cardInstances: {
        ...state.cardInstances,
        [creatureId]: {
          ...(state.cardInstances[creatureId] as BattleCardInstance),
          type: "spell"
        }
      }
    };
    const spellView = projectPublicBattleView(spellState).playerHand[0];

    expect(creatureView?.isActionable).toBe(true);
    expect(creatureView?.disabledReason).toBeUndefined();
    expect(spellView?.isActionable).toBe(false);
    expect(spellView?.disabledReason).toBe("Spell effects are planned for a later cycle.");
  });
});

function createSummonState(side: BattleSide): {
  readonly state: BattleState;
  readonly creatureId: string;
} {
  const sampled = fc.sample(battleStateArbitrary, {
    numRuns: 1,
    seed: side === "player" ? 4102 : 4103
  })[0];
  const card = Object.values(sampled.cardInstances).find(
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
    currentCost: 2,
    cost: 2,
    attack: card.attack ?? 3,
    currentAttack: card.currentAttack ?? card.attack ?? 3,
    health: card.health ?? 4,
    currentHp: card.currentHp ?? card.health ?? 4,
    maxHp: card.maxHp ?? card.health ?? 4,
    movement: 2,
    summonedThisTurn: false,
    movedThisTurn: false
  };
  const player = sampled.players[side];

  return {
    creatureId: creature.instanceId,
    state: {
      ...sampled,
      phase: "play",
      activeSide: side,
      terminalResult: undefined,
      board: createInitialBattleBoard(),
      players: {
        ...sampled.players,
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
        ...sampled.cardInstances,
        [creature.instanceId]: creature
      }
    }
  };
}
