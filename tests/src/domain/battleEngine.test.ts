import {
  GameEngine,
  createInitialBattleBoard,
  generateLegalActions,
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
      summonedThisTurn: true
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "creature.summoned",
      "resonance.changed"
    ]);
    expect(result.state.eventCursor).toBe(previousCursor + 2);
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
