import {
  createInitialBattleBoard,
  getBattleBaseById,
  listAttackersInBoardOrder,
  placeCreatureForTest,
  resolveAttackPhase,
  resolveCreatureAttack,
  snapshotAttackTargets,
  type BattleCardInstance,
  type BattleSide,
  type BattleState,
  type BoardCoordinate
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("automatic attack resolution", () => {
  it("lists only turn-side board creatures in entry order, including summoned-this-turn creatures", () => {
    const fixture = createFixture();
    let state = place(fixture.state, fixture.playerIds[0], "player", { column: 6, row: 4 }, 3, 5);
    state = place(state, fixture.playerIds[1], "player", { column: 5, row: 4 }, 2, 5);
    state = place(state, fixture.cpuIds[0], "cpu", { column: 7, row: 4 }, 4, 5);
    state = withCard(state, fixture.playerIds[0], { boardEntrySequence: 20, summonedThisTurn: true });
    state = withCard(state, fixture.playerIds[1], { boardEntrySequence: 10 });

    expect(listAttackersInBoardOrder(state, "player")).toEqual([
      fixture.playerIds[1],
      fixture.playerIds[0]
    ]);
  });

  it("snapshots enemy creatures first by entry order and bases second by canonical order", () => {
    const fixture = createFixture();
    let state = place(fixture.state, fixture.playerIds[0], "player", { column: 6, row: 4 }, 3, 5);
    state = place(state, fixture.cpuIds[0], "cpu", { column: 7, row: 4 }, 1, 5);
    state = place(state, fixture.cpuIds[1], "cpu", { column: 5, row: 5 }, 1, 5);
    state = withCard(state, fixture.cpuIds[0], { boardEntrySequence: 30 });
    state = withCard(state, fixture.cpuIds[1], { boardEntrySequence: 20 });

    expect(snapshotAttackTargets(state, fixture.playerIds[0]).targets).toEqual([
      { kind: "creature", instanceId: fixture.cpuIds[1] },
      { kind: "creature", instanceId: fixture.cpuIds[0] },
      { kind: "base", baseId: "neutral-center" }
    ]);
  });

  it("deals full current attack to every target without counterattack", () => {
    const fixture = createFixture();
    let state = place(fixture.state, fixture.playerIds[0], "player", { column: 6, row: 4 }, 3, 8);
    state = place(state, fixture.cpuIds[0], "cpu", { column: 5, row: 4 }, 1, 6);
    state = place(state, fixture.cpuIds[1], "cpu", { column: 7, row: 4 }, 1, 7);
    const result = resolveAttackPhase(state, "player", 100);

    expect(result.state.cardInstances[fixture.cpuIds[0]]?.currentHp).toBe(3);
    expect(result.state.cardInstances[fixture.cpuIds[1]]?.currentHp).toBe(4);
    expect(result.state.cardInstances[fixture.playerIds[0]]?.currentHp).toBe(8);
    expect(getBattleBaseById(result.state.bases, "neutral-center").currentHp).toBe(17);
    expect(result.events.filter((event) => event.type === "creature.damaged")).toHaveLength(2);
    expect(result.events.filter((event) => event.type === "base.damaged")).toHaveLength(1);
  });

  it("skips a snapshotted target that has left the board without selecting a replacement", () => {
    const fixture = createFixture();
    let state = place(fixture.state, fixture.playerIds[0], "player", { column: 4, row: 4 }, 3, 5);
    state = place(state, fixture.cpuIds[0], "cpu", { column: 5, row: 4 }, 1, 5);
    const snapshot = snapshotAttackTargets(state, fixture.playerIds[0]);
    state = withCard(state, fixture.cpuIds[0], { zone: "graveyard", position: undefined });
    const result = resolveCreatureAttack(state, snapshot, 50);

    expect(result.events.map((event) => event.type)).toEqual([
      "attack.attacker-started",
      "attack.targeted",
      "attack.target-skipped"
    ]);
    expect(result.events[2]?.data?.reason).toBe("target-left-board");
  });

  it("skips an unavailable queued attacker", () => {
    const fixture = createFixture();
    const result = resolveCreatureAttack(
      fixture.state,
      { attackerId: fixture.playerIds[0], targets: [] },
      80
    );

    expect(result.state).toBe(fixture.state);
    expect(result.events).toMatchObject([
      { sequence: 80, type: "attack.attacker-skipped", instanceId: fixture.playerIds[0] }
    ]);
  });

  it("emits contiguous event sequences and aligns the state cursor", () => {
    const fixture = createFixture();
    const state = place(fixture.state, fixture.playerIds[0], "player", { column: 4, row: 4 }, 2, 5);
    const result = resolveAttackPhase(state, "player", 200);

    expect(result.events.map((event) => event.sequence)).toEqual(
      result.events.map((_, index) => 200 + index)
    );
    expect(result.state.eventCursor).toBe(result.events.at(-1)?.sequence);
    expect(result.events.at(-1)?.type).toBe("attack.phase-ended");
  });
});

function createFixture(): {
  readonly state: BattleState;
  readonly playerIds: readonly [string, string];
  readonly cpuIds: readonly [string, string];
} {
  const sampled = fc.sample(battleStateArbitrary, { numRuns: 1, seed: 8202 })[0];
  const playerIds = Object.values(sampled.cardInstances)
    .filter((card) => card.ownerSide === "player")
    .slice(0, 2)
    .map((card) => card.instanceId);
  const cpuIds = Object.values(sampled.cardInstances)
    .filter((card) => card.ownerSide === "cpu")
    .slice(0, 2)
    .map((card) => card.instanceId);
  if (!playerIds[0] || !playerIds[1] || !cpuIds[0] || !cpuIds[1]) {
    throw new Error("Expected attack fixture cards for both sides.");
  }
  return {
    state: {
      ...sampled,
      phase: "automatic",
      activeSide: "player",
      board: createInitialBattleBoard(),
      terminalResult: undefined
    },
    playerIds: [playerIds[0], playerIds[1]],
    cpuIds: [cpuIds[0], cpuIds[1]]
  };
}

function place(
  state: BattleState,
  instanceId: string,
  side: BattleSide,
  coordinate: BoardCoordinate,
  attack: number,
  hp: number
): BattleState {
  const placed = placeCreatureForTest(state, instanceId, side, coordinate.column, coordinate.row);
  return withCard(placed, instanceId, {
    type: "creature",
    controllerSide: side,
    currentAttack: attack,
    attack,
    currentHp: hp,
    maxHp: hp,
    health: hp,
    summonedThisTurn: true
  });
}

function withCard(
  state: BattleState,
  instanceId: string,
  patch: Partial<BattleCardInstance>
): BattleState {
  const card = state.cardInstances[instanceId];
  if (!card) {
    throw new Error(`Missing fixture card ${instanceId}.`);
  }
  return {
    ...state,
    cardInstances: {
      ...state.cardInstances,
      [instanceId]: { ...card, ...patch }
    }
  };
}
