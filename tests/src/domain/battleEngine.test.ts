import {
  GameEngine,
  createInitialBattleBoard,
  generateLegalActions,
  getBattleBaseById,
  placeCreatureForTest,
  type BattleCardInstance,
  type BattleCommand,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("battle engine", () => {
  it("rejects invalid commands without mutating state", () => {
    const state = sampleBattleState();
    const invalid: BattleCommand = {
      type: "summonCreature",
      side: state.activeSide,
      handInstanceId: "missing",
      destination: { column: 99, row: 99 }
    };
    const result = GameEngine.submitCommand(state, invalid);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
  });

  it("accepts generated legal actions through the same reducer path", () => {
    const state = sampleBattleState();
    const action = generateLegalActions(state, state.activeSide)[0];

    expect(action).toBeDefined();
    if (!action) {
      return;
    }

    const result = GameEngine.submitCommand(state, action.command);

    expect(result.ok).toBe(true);
  });

  it("applies exactly one confirmed summon and emits its confirmed events", () => {
    const { state, creatureId, otherHandId } = createPlayerSummonState();
    const previousPp = state.players.player.currentPp;
    const previousCursor = state.eventCursor;
    const result = GameEngine.submitCommand(state, {
      type: "summonCreature",
      side: "player",
      handInstanceId: creatureId,
      destination: { column: 7, row: 9 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.players.player.currentPp).toBe(previousPp - 3);
    expect(result.state.players.player.handZone).toEqual([otherHandId]);
    expect(
      result.state.board.squares.find(
        (square) => square.coordinate.column === 7 && square.coordinate.row === 9
      )?.occupantId
    ).toBe(creatureId);
    expect(result.state.cardInstances[creatureId]).toMatchObject({
      zone: "board",
      position: { column: 7, row: 9 },
      boardEntrySequence: previousCursor + 1,
      summonedThisTurn: true
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "creature.summoned",
      "resonance.changed"
    ]);
    expect(result.state.eventCursor).toBe(previousCursor + 2);
    expect(result.state.cardInstances[creatureId]?.boardEntrySequence).toBe(
      result.events[0]?.sequence
    );
  });

  it("rejects an illegal summon destination with the original state identity", () => {
    const { state, creatureId } = createPlayerSummonState();
    const result = GameEngine.submitCommand(state, {
      type: "summonCreature",
      side: "player",
      handInstanceId: creatureId,
      destination: { column: 5, row: 8 }
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.code)).toEqual([
        "battle.board.destination-invalid"
      ]);
    }
  });

  it("applies a confirmed multi-step move atomically", () => {
    const { state, creatureId } = createPlayerMovementState();
    const result = GameEngine.submitCommand(state, {
      type: "moveCreature",
      side: "player",
      creatureInstanceId: creatureId,
      origin: { column: 4, row: 5 },
      path: [
        { column: 5, row: 5 },
        { column: 6, row: 4 }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(
      result.state.board.squares.find(
        (square) => square.coordinate.column === 4 && square.coordinate.row === 5
      )?.occupantId
    ).toBeUndefined();
    expect(
      result.state.board.squares.find(
        (square) => square.coordinate.column === 6 && square.coordinate.row === 4
      )?.occupantId
    ).toBe(creatureId);
    expect(result.state.cardInstances[creatureId]).toMatchObject({
      position: { column: 6, row: 4 },
      movedThisTurn: true
    });
    expect(result.events.map((event) => event.type)).toEqual(["creature.moved"]);
  });

  it("accepts a path returning to origin and preserves one board occupant", () => {
    const { state, creatureId } = createPlayerMovementState();
    const result = GameEngine.submitCommand(state, {
      type: "moveCreature",
      side: "player",
      creatureInstanceId: creatureId,
      origin: { column: 4, row: 5 },
      path: [
        { column: 5, row: 5 },
        { column: 4, row: 5 }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.state.board.squares.filter((square) => square.occupantId === creatureId)
      ).toHaveLength(1);
      expect(result.state.cardInstances[creatureId]).toMatchObject({
        position: { column: 4, row: 5 },
        movedThisTurn: true
      });
    }
  });

  it("rejects a stale expected origin with the original state identity", () => {
    const { state, creatureId } = createPlayerMovementState();
    const result = GameEngine.submitCommand(state, {
      type: "moveCreature",
      side: "player",
      creatureInstanceId: creatureId,
      origin: { column: 3, row: 5 },
      path: [{ column: 5, row: 5 }]
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (!result.ok) {
      expect(result.issues[0]?.code).toBe("battle.move.origin-changed");
    }
  });

  it("advances to the opposing side after end play phase", () => {
    const state = sampleBattleState();
    const result = GameEngine.submitCommand(state, {
      type: "endPlayPhase",
      side: state.activeSide,
      reason: "manual"
    });

    expect(result.ok).toBe(true);
    if (result.ok && !result.state.terminalResult) {
      expect(result.state.activeSide).not.toBe(state.activeSide);
      expect(result.events.some((event) => event.type === "standby.resolved")).toBe(true);
    }
  });

  it("assigns unique board entry sequences to repeated test placements", () => {
    const state = sampleBattleState();
    const [firstId, secondId] = Object.values(state.cardInstances)
      .filter((card) => card.ownerSide === "player")
      .map((card) => card.instanceId);

    expect(firstId).toBeDefined();
    expect(secondId).toBeDefined();
    if (!firstId || !secondId) {
      return;
    }

    const first = placeCreatureForTest(state, firstId, "player", 4, 5);
    const second = placeCreatureForTest(first, secondId, "player", 5, 5);
    const sequences = [
      second.cardInstances[firstId]?.boardEntrySequence,
      second.cardInstances[secondId]?.boardEntrySequence
    ];

    expect(sequences.every((sequence) => Number.isInteger(sequence))).toBe(true);
    expect(new Set(sequences).size).toBe(2);
    expect(second.eventCursor).toBe(sequences[1]);
  });

  it("does not damage a distant player base during automatic attack", () => {
    const fixture = createPlayerMovementState();
    const state: BattleState = {
      ...fixture.state,
      activeSide: "player",
      phase: "play",
      cardInstances: {
        ...fixture.state.cardInstances,
        [fixture.creatureId]: {
          ...fixture.state.cardInstances[fixture.creatureId]!,
          currentAttack: 3
        }
      }
    };
    const result = GameEngine.submitCommand(state, {
      type: "endPlayPhase",
      side: "player",
      reason: "manual"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getBattleBaseById(result.state.bases, "cpu-base").currentHp).toBe(20);
      expect(result.events.some((event) => event.type === "attack.phase-started")).toBe(true);
      expect(result.events.some((event) => event.type === "attack.phase-ended")).toBe(true);
    }
  });
});

function sampleBattleState() {
  const fc = require("fast-check") as typeof import("fast-check");
  return fc.sample(battleStateArbitrary, { numRuns: 1 })[0];
}

function createPlayerSummonState(): {
  readonly state: BattleState;
  readonly creatureId: string;
  readonly otherHandId: string;
} {
  const sampled = fc.sample(battleStateArbitrary, { numRuns: 1, seed: 4204 })[0];
  const [creature, otherCard] = Object.values(sampled.cardInstances).filter(
    (card) => card.ownerSide === "player"
  );

  if (!creature || !otherCard) {
    throw new Error("Expected two player card fixtures.");
  }

  const summonedCreature: BattleCardInstance = {
    ...creature,
    type: "creature",
    zone: "hand",
    position: undefined,
    cost: 3,
    currentCost: 3,
    attack: creature.attack ?? 3,
    currentAttack: creature.currentAttack ?? creature.attack ?? 3,
    health: creature.health ?? 4,
    currentHp: creature.currentHp ?? creature.health ?? 4,
    maxHp: creature.maxHp ?? creature.health ?? 4,
    movement: 2,
    summonedThisTurn: false,
    movedThisTurn: false
  };
  const retainedCard: BattleCardInstance = {
    ...otherCard,
    zone: "hand",
    position: undefined
  };

  return {
    creatureId: summonedCreature.instanceId,
    otherHandId: retainedCard.instanceId,
    state: {
      ...sampled,
      phase: "play",
      activeSide: "player",
      terminalResult: undefined,
      board: createInitialBattleBoard(),
      players: {
        ...sampled.players,
        player: {
          ...sampled.players.player,
          handZone: [summonedCreature.instanceId, retainedCard.instanceId],
          deckZone: sampled.players.player.deckZone.filter(
            (id) => id !== summonedCreature.instanceId && id !== retainedCard.instanceId
          ),
          currentPp: 7,
          maxPp: 7
        }
      },
      cardInstances: {
        ...sampled.cardInstances,
        [summonedCreature.instanceId]: summonedCreature,
        [retainedCard.instanceId]: retainedCard
      }
    }
  };
}

function createPlayerMovementState(): {
  readonly state: BattleState;
  readonly creatureId: string;
} {
  const fixture = createPlayerSummonState();
  const placed = placeCreatureForTest(
    fixture.state,
    fixture.creatureId,
    "player",
    4,
    5
  );

  return {
    creatureId: fixture.creatureId,
    state: {
      ...placed,
      cardInstances: {
        ...placed.cardInstances,
        [fixture.creatureId]: {
          ...placed.cardInstances[fixture.creatureId]!,
          summonedThisTurn: false,
          movedThisTurn: false,
          movement: 3
        }
      }
    }
  };
}
