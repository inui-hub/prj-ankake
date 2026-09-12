import {
  createInitialBattleBoard,
  drainTriggers,
  getEffectiveModifiedValue,
  getLegalEffectTargets,
  placeCreatureForTest,
  resolveLifecycleEffects,
  resolveEffect,
  getExecutablePlayEffects,
  type EffectContext,
  type EffectModifier,
  type BattleCardInstance,
  type BattleState,
  type PendingTrigger
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("effect resolution foundations", () => {
  it("revalidates a selected enemy, applies operations in order, and leaves its input immutable", () => {
    const { state, sourceId, enemyId } = createBoardState();
    const context = makeContext(state, sourceId, { kind: "creatures", instanceIds: [enemyId] }, [
      { kind: "damage", target: "enemy-creature", amount: 2, minimumTargets: 1, maximumTargets: 1 },
      { kind: "emit", target: "enemy-creature", eventType: "spell.resolved", message: "follow-up", minimumTargets: 1, maximumTargets: 1 }
    ]);
    const result = resolveEffect(context);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.effect).toMatchObject({ status: "resolved", completedOperationCount: 2 });
    expect(result.state.cardInstances[enemyId]?.currentHp).toBe((state.cardInstances[enemyId]?.currentHp ?? 0) - 2);
    expect(state.cardInstances[enemyId]?.currentHp).not.toBe(result.state.cardInstances[enemyId]?.currentHp);
    expect(result.events.map((event) => event.sequence)).toEqual([...result.events].map((_, index) => context.firstSequence + index));
  });

  it("destroys a creature lethally damaged by a generic effect", () => {
    const { state, sourceId, enemyId } = createBoardState();
    const lethalState: BattleState = {
      ...state,
      cardInstances: {
        ...state.cardInstances,
        [enemyId]: { ...state.cardInstances[enemyId]!, currentHp: 2, maxHp: 2, health: 2 }
      }
    };
    const result = resolveEffect(makeContext(lethalState, sourceId, { kind: "creatures", instanceIds: [enemyId] }, [
      { kind: "damage", target: "enemy-creature", amount: 2, minimumTargets: 1, maximumTargets: 1 }
    ]));

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events.map((event) => event.type)).toEqual(["creature.damaged", "creature.destroyed"]);
    expect(result.state.cardInstances[enemyId]).toMatchObject({ zone: "graveyard", currentHp: 0 });
    expect(result.state.board.squares.some((square) => square.occupantId === enemyId)).toBe(false);
    expect(result.state.players.cpu.graveyardZone).toContain(enemyId);
  });

  it("rejects a stale target selection without changing state or its RNG", () => {
    const { state, sourceId } = createBoardState();
    const context = makeContext(state, sourceId, { kind: "creatures", instanceIds: ["missing"] }, [{ kind: "damage", target: "enemy-creature", amount: 1, minimumTargets: 1, maximumTargets: 1 }]);
    const result = resolveEffect(context);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.effect.status).toBe("fizzled");
    expect(result.state).toBe(state);
    expect(result.state.metadata.rng).toBe(context.state.metadata.rng);
  });

  it("uses stable identifiers for legal targets and trigger queue order", () => {
    const { state, sourceId } = createBoardState();
    const targets = getLegalEffectTargets(state, "player", { kind: "damage", target: "enemy-creature", amount: 1, minimumTargets: 1, maximumTargets: 2 });
    expect(targets.map((target) => target.kind === "creature" ? target.instanceId : target.baseId)).toEqual([...targets.map((target) => target.kind === "creature" ? target.instanceId : target.baseId)].sort());
    const initial: PendingTrigger[] = [
      trigger(3, "source-b", "b"), trigger(2, "source-z", "a"), trigger(3, "source-a", "z")
    ];
    const drained = drainTriggers(initial, (item) => ({ value: item.effectId }));
    expect(drained).toEqual({ ok: true, values: ["a", "z", "b"] });
    expect(sourceId).toBeDefined();
  });

  it("stops trigger loops and derives only active modifiers", () => {
    const cyclic = trigger(1, "source", "effect");
    expect(drainTriggers([cyclic], () => ({ value: "x", enqueued: [cyclic] }))).toMatchObject({ ok: false, rejection: "trigger-loop", values: ["x"] });
    const modifiers: EffectModifier[] = [
      { id: "b", targetInstanceId: "target", attribute: "attack", operator: "add", value: 2, startedSequence: 2 },
      { id: "a", targetInstanceId: "target", attribute: "attack", operator: "set", value: 5, startedSequence: 1 },
      { id: "expired", targetInstanceId: "target", attribute: "attack", operator: "add", value: 9, startedSequence: 3, expiresAtTurn: 1 }
    ];
    expect(getEffectiveModifiedValue(1, modifiers, "attack", "target", 2)).toBe(7);
  });

  it("dispatches an other-allied-destruction trigger from the destruction snapshot", () => {
    const { state, sourceId, enemyId } = createBoardState();
    const watcher: BattleCardInstance = {
      ...state.cardInstances[sourceId]!, catalogCardId: "AK-056", effectIds: ["AK-056.primary"], effectText: "他の味方クリーチャーが破壊されたとき、このクリーチャーを+1/+1する。", currentAttack: 2, currentHp: 3, maxHp: 3
    };
    const fallen: BattleCardInstance = { ...state.cardInstances[enemyId]!, ownerSide: "player", controllerSide: "player", zone: "graveyard", position: undefined, currentHp: 0 };
    const staged: BattleState = { ...state, cardInstances: { ...state.cardInstances, [sourceId]: watcher, [enemyId]: fallen } };
    const result = resolveLifecycleEffects(staged, [{ sequence: 20, type: "creature.destroyed", side: "player", instanceId: enemyId, message: "destroyed", data: { previousColumn: 5, previousRow: 5 } }]);
    expect(result.state.cardInstances[sourceId]).toMatchObject({ currentAttack: 3, currentHp: 4, maxHp: 4 });
    expect(result.events).toHaveLength(1);
  });

  it("normalizes structured creature/base selections and preserves every effect ID", () => {
    const { state, sourceId, enemyId } = createBoardState();
    const context = makeContext(state, sourceId, { kind: "structured", value: { creatureIds: [enemyId] } }, [{ kind: "damage", target: "enemy-creature", amount: 2, minimumTargets: 1, maximumTargets: 1 }]);
    const resolved = resolveEffect(context);
    expect(resolved.accepted).toBe(true);
    if (resolved.accepted) expect(resolved.state.cardInstances[enemyId]!.currentHp).toBe(4);
    const programs = getExecutablePlayEffects({ ...state.cardInstances[sourceId]!, catalogCardId: "AK-016", effectIds: ["first", "second"] });
    expect(programs.map((program) => program.effectId)).toEqual(["first", "second"]);
  });

  it("rejects lifecycle transactions that exceed the trigger budget without committing partial state", () => {
    const { state, sourceId } = createBoardState();
    const source = { ...state.cardInstances[sourceId]!, catalogCardId: "AK-016", effectIds: ["AK-016.primary"], effectText: "召喚時：カードを1枚引く。" };
    const staged = { ...state, cardInstances: { ...state.cardInstances, [sourceId]: source } };
    const result = resolveLifecycleEffects(staged, Array.from({ length: 65 }, (_, index) => ({ sequence: index + 1, type: "creature.summoned" as const, side: "player" as const, instanceId: sourceId, message: "summoned" })));
    expect(result).toMatchObject({ accepted: false, rejection: "trigger-loop", state: staged, events: [] });
  });
});

function createBoardState() {
  const sampled = fc.sample(battleStateArbitrary, { numRuns: 1, seed: 7621 })[0]!;
  const player = Object.values(sampled.cardInstances).find((card) => card.ownerSide === "player")!;
  const enemy = Object.values(sampled.cardInstances).find((card) => card.ownerSide === "cpu")!;
  const asCreature = (card: BattleCardInstance): BattleCardInstance => ({ ...card, type: "creature", currentHp: 6, maxHp: 6, health: 6 });
  const reset: BattleState = { ...sampled, board: createInitialBattleBoard(), cardInstances: { ...sampled.cardInstances, [player.instanceId]: asCreature(player), [enemy.instanceId]: asCreature(enemy) } };
  const withPlayer = placeCreatureForTest(reset, player.instanceId, "player", 4, 5);
  return { state: placeCreatureForTest(withPlayer, enemy.instanceId, "cpu", 5, 5), sourceId: player.instanceId, enemyId: enemy.instanceId };
}

function makeContext(state: ReturnType<typeof createBoardState>["state"], sourceInstanceId: string, selection: EffectContext["selection"], operations: EffectContext["effect"]["operations"]): EffectContext {
  return { state, sourceInstanceId, controllerSide: "player", effect: { effectId: "test.primary", operations, consumedOnFizzle: true }, selection, firstSequence: state.eventCursor + 1 };
}
function trigger(eventSequence: number, sourceInstanceId: string, effectId: string): PendingTrigger { return { eventSequence, sourceInstanceId, effectId, depth: 0, snapshot: { controllerSide: "player", targetIds: [] } }; }
