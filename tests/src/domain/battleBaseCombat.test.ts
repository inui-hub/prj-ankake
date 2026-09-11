import {
  applyBaseDamage,
  applyCreatureDamage,
  createInitialBattleBoard,
  getBattleBaseById,
  getOccupantId,
  placeCreatureForTest,
  updateBattleBase,
  type BattleCardInstance,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("creature and base combat", () => {
  it("keeps a surviving creature on board and preserves its entry sequence", () => {
    const fixture = createCreatureFixture(5);
    const beforeSequence = fixture.state.cardInstances[fixture.targetId]?.boardEntrySequence;
    const attacker = fixture.state.cardInstances[fixture.attackerId] as BattleCardInstance;
    const result = applyCreatureDamage(fixture.state, attacker, fixture.targetId, 2, 40);

    expect(result.state.cardInstances[fixture.targetId]).toMatchObject({
      zone: "board",
      currentHp: 3,
      boardEntrySequence: beforeSequence
    });
    expect(getOccupantId(result.state.board, { column: 5, row: 4 })).toBe(fixture.targetId);
    expect(result.events.map((event) => event.type)).toEqual(["creature.damaged"]);
  });

  it("destroys a lethal creature and moves it to the controller graveyard once", () => {
    const fixture = createCreatureFixture(3);
    const attacker = fixture.state.cardInstances[fixture.attackerId] as BattleCardInstance;
    const result = applyCreatureDamage(fixture.state, attacker, fixture.targetId, 4, 50);
    const destroyed = result.state.cardInstances[fixture.targetId];

    expect(destroyed).toMatchObject({ zone: "graveyard", currentHp: 0 });
    expect(destroyed?.position).toBeUndefined();
    expect(destroyed?.boardEntrySequence).toBeUndefined();
    expect(getOccupantId(result.state.board, { column: 5, row: 4 })).toBeUndefined();
    expect(result.state.players.cpu.graveyardZone.filter((id) => id === fixture.targetId)).toHaveLength(1);
    expect(result.events.map((event) => event.type)).toEqual([
      "creature.damaged",
      "creature.destroyed"
    ]);
  });

  it.each([
    ["none", "unowned capture"],
    ["cpu", "direct recapture"]
  ] as const)("captures a neutral base from %s (%s) and restores max HP", (owner, _label) => {
    const sampled = sampleState();
    const state: BattleState = {
      ...sampled,
      bases: updateBattleBase(sampled.bases, "neutral-left", (base) => ({
        ...base,
        owner,
        currentHp: 2
      }))
    };
    const result = applyBaseDamage(state, "player", "attacker", "neutral-left", 3, 60);
    const captured = getBattleBaseById(result.state.bases, "neutral-left");

    expect(captured).toMatchObject({ owner: "player", currentHp: captured.maxHp });
    expect(result.events.map((event) => event.type)).toEqual([
      "base.damaged",
      "base.captured"
    ]);
    expect(result.events[1]?.data).toMatchObject({ previousOwner: owner, newOwner: "player" });
  });

  it("ends the battle immediately when an enemy player base reaches zero", () => {
    const sampled = sampleState();
    const state = {
      ...sampled,
      bases: updateBattleBase(sampled.bases, "cpu-base", (base) => ({ ...base, currentHp: 2 }))
    };
    const result = applyBaseDamage(state, "player", "attacker", "cpu-base", 3, 70);

    expect(getBattleBaseById(result.state.bases, "cpu-base")).toMatchObject({
      owner: "cpu",
      currentHp: 0
    });
    expect(result.state.terminalResult).toMatchObject({
      winner: "player",
      loser: "cpu",
      reason: "base-destroyed",
      finalEventSequence: 71
    });
    expect(result.events.map((event) => event.type)).toEqual(["base.damaged", "battle.ended"]);
  });

  it("wins by capturing the third neutral base", () => {
    const sampled = sampleState();
    let bases = updateBattleBase(sampled.bases, "neutral-left", (base) => ({
      ...base,
      owner: "player",
      currentHp: base.maxHp
    }));
    bases = updateBattleBase(bases, "neutral-center", (base) => ({
      ...base,
      owner: "player",
      currentHp: base.maxHp
    }));
    bases = updateBattleBase(bases, "neutral-right", (base) => ({
      ...base,
      owner: "cpu",
      currentHp: 1
    }));
    const result = applyBaseDamage(
      { ...sampled, bases },
      "player",
      "attacker",
      "neutral-right",
      1,
      80
    );

    expect(result.state.terminalResult).toMatchObject({
      winner: "player",
      reason: "neutral-bases-controlled",
      finalEventSequence: 82
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "base.damaged",
      "base.captured",
      "battle.ended"
    ]);
  });
});

function createCreatureFixture(targetHp: number): {
  readonly state: BattleState;
  readonly attackerId: string;
  readonly targetId: string;
} {
  const sampled = sampleState();
  const attackerId = Object.values(sampled.cardInstances).find(
    (card) => card.ownerSide === "player"
  )?.instanceId;
  const targetId = Object.values(sampled.cardInstances).find(
    (card) => card.ownerSide === "cpu"
  )?.instanceId;
  if (!attackerId || !targetId) {
    throw new Error("Expected combat fixture cards.");
  }
  let state = placeCreatureForTest(
    { ...sampled, board: createInitialBattleBoard() },
    attackerId,
    "player",
    4,
    4
  );
  state = placeCreatureForTest(state, targetId, "cpu", 5, 4);
  return {
    attackerId,
    targetId,
    state: {
      ...state,
      cardInstances: {
        ...state.cardInstances,
        [attackerId]: asCreature(state.cardInstances[attackerId]!, "player", 4, 5),
        [targetId]: asCreature(state.cardInstances[targetId]!, "cpu", 2, targetHp)
      }
    }
  };
}

function asCreature(
  card: BattleCardInstance,
  controllerSide: "player" | "cpu",
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
    maxHp: hp
  };
}

function sampleState(): BattleState {
  return fc.sample(battleStateArbitrary, { numRuns: 1, seed: 8302 })[0];
}
