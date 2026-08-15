import {
  CANONICAL_EFFECT_MANIFEST,
  createInitialBattleBoard,
  getExecutablePlayEffects,
  placeCreatureForTest,
  resolveEffect,
  type BattleCardInstance,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";
import {
  CARD_EFFECT_COVERAGE,
  CANONICAL_CARD_IDS,
  EXECUTABLE_EFFECT_EXPECTATIONS,
  EXECUTABLE_EFFECT_IDS,
  UNIMPLEMENTED_EFFECT_IDS
} from "./cardEffectCoverage";

describe("card effect coverage matrix", () => {
  it("tracks each canonical card exactly once and agrees with the effect manifest", () => {
    expect(CARD_EFFECT_COVERAGE).toHaveLength(62);
    expect(new Set(CARD_EFFECT_COVERAGE.map((row) => row.cardId)).size).toBe(62);
    expect(CARD_EFFECT_COVERAGE.map((row) => row.cardId)).toEqual(CANONICAL_CARD_IDS);
    expect(CANONICAL_EFFECT_MANIFEST.map((entry) => entry.cardId)).toEqual(CANONICAL_CARD_IDS);

    for (const row of CARD_EFFECT_COVERAGE) {
      const entry = CANONICAL_EFFECT_MANIFEST.find((candidate) => candidate.cardId === row.cardId);
      expect(entry).toBeDefined();
      expect(row.effectId).toBe(entry?.effects === "none" ? "none" : entry?.effects[0]?.effectId);
      expect(row.expectedState).not.toHaveLength(0);
    }
  });

  it("does not overstate executable coverage", () => {
    const actualExecutableEffectIds = CANONICAL_EFFECT_MANIFEST.flatMap((entry) => {
      if (entry.effects === "none") return [];
      return getExecutablePlayEffects(cardFor(entry.cardId, entry.effects[0]?.effectId ?? "", entry.effects[0]?.operations[0]?.text ?? ""))
        .map((effect) => effect.effectId);
    });

    expect(actualExecutableEffectIds.sort()).toEqual([...EXECUTABLE_EFFECT_IDS].sort());
    expect(CARD_EFFECT_COVERAGE.filter((row) => row.status === "verified-executable")).toHaveLength(EXECUTABLE_EFFECT_IDS.length);
    expect(CARD_EFFECT_COVERAGE.filter((row) => row.status === "resolver-only-not-integrated")).toHaveLength(0);
    expect(CARD_EFFECT_COVERAGE.filter((row) => row.status === "no-effect-verified")).toHaveLength(7);
    expect(CARD_EFFECT_COVERAGE.filter((row) => row.status === "documented-not-executable").map((row) => row.effectId)).toEqual(UNIMPLEMENTED_EFFECT_IDS);
    expect(EXECUTABLE_EFFECT_IDS).toHaveLength(55);
    expect(UNIMPLEMENTED_EFFECT_IDS).toHaveLength(0);
  });

  it.each(EXECUTABLE_EFFECT_IDS)("executes the runtime program for %s", (effectId) => {
    const cardId = effectId.replace(".primary", "");
    const { state, sourceId, enemyId, allyId } = createScenario();
    const effect = getExecutablePlayEffects(cardFor(cardId, effectId, effectTextFor(cardId)))[0];
    expect(effect).toBeDefined();
    if (!effect) return;
    const selection = Object.prototype.hasOwnProperty.call(EXECUTABLE_EFFECT_EXPECTATIONS, effectId)
      ? { kind: "creatures" as const, instanceIds: [effectId === "AK-037.primary" ? allyId : enemyId] }
      : { kind: "structured" as const, value: { creatureIds: [allyId, enemyId], lane: "center" as const, coordinates: [{ column: 4, row: 4 }] } };
    const result = resolveEffect({ state, sourceInstanceId: sourceId, controllerSide: "player", effect, selection, firstSequence: state.eventCursor + 1 });
    expect(result).toMatchObject({ accepted: true, effect: { status: "resolved", completedOperationCount: 1 } });
    if (result.accepted) expect(result.events.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(EXECUTABLE_EFFECT_EXPECTATIONS))(
    "resolves the matrix-backed executable effect %s",
    (effectId, expected) => {
      const cardId = effectId.replace(".primary", "");
      const { state, sourceId, enemyId, allyId } = createScenario();
      const source = cardFor(cardId, effectId, effectTextFor(cardId));
      const effect = getExecutablePlayEffects(source)[0];
      expect(effect).toBeDefined();
      if (!effect) return;
      const targetId = expected.target === "enemy" ? enemyId : allyId;
      const beforeHealth = state.cardInstances[targetId]?.currentHp ?? 0;
      const result = resolveEffect({
        state, sourceInstanceId: sourceId, controllerSide: "player", effect,
        selection: { kind: "creatures", instanceIds: [targetId] },
        firstSequence: state.eventCursor + 1
      });

      expect(result).toMatchObject({ accepted: true, effect: { status: "resolved", completedOperationCount: 1 } });
      if (!result.accepted) return;
      expect(result.state.cardInstances[targetId]?.currentHp).toBe(beforeHealth + expected.healthDelta);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({ type: expected.eventType, data: { effectId } });
    }
  );
});

function createScenario(): { readonly state: BattleState; readonly sourceId: string; readonly enemyId: string; readonly allyId: string } {
  const sampled = fc.sample(battleStateArbitrary, { numRuns: 1, seed: 26815 })[0]!;
  const playerCards = Object.values(sampled.cardInstances).filter((card) => card.ownerSide === "player");
  const enemyCard = Object.values(sampled.cardInstances).find((card) => card.ownerSide === "cpu")!;
  const [sourceCard, allyCard] = playerCards;
  if (!sourceCard || !allyCard) throw new Error("Coverage fixture needs two player cards.");
  const creature = (card: BattleCardInstance, currentHp: number, maxHp = 6): BattleCardInstance => ({
    ...card, type: "creature", zone: "hand", position: undefined, currentHp, maxHp, health: maxHp,
    summonedThisTurn: false, movedThisTurn: false
  });
  const reset: BattleState = {
    ...sampled, board: createInitialBattleBoard(),
    cardInstances: {
      ...sampled.cardInstances,
      [sourceCard.instanceId]: creature(sourceCard, 6),
      [allyCard.instanceId]: creature(allyCard, 3),
      [enemyCard.instanceId]: creature(enemyCard, 10, 10)
    }
  };
  const withSource = placeCreatureForTest(reset, sourceCard.instanceId, "player", 3, 5);
  const withAlly = placeCreatureForTest(withSource, allyCard.instanceId, "player", 4, 5);
  return {
    state: placeCreatureForTest(withAlly, enemyCard.instanceId, "cpu", 5, 5),
    sourceId: sourceCard.instanceId, allyId: allyCard.instanceId, enemyId: enemyCard.instanceId
  };
}

function effectTextFor(cardId: string): string {
  const entry = CANONICAL_EFFECT_MANIFEST.find((candidate) => candidate.cardId === cardId);
  if (!entry || entry.effects === "none") throw new Error(`Missing effect text for ${cardId}.`);
  return entry.effects[0]?.operations[0]?.text ?? "";
}

function cardFor(cardId: string, effectId: string, effectText: string): BattleCardInstance {
  return {
    instanceId: `${cardId}-coverage`, catalogCardId: cardId, ownerSide: "player", controllerSide: "player",
    zone: "hand", name: cardId, type: "spell", attribute: "fire", cost: 1, currentCost: 1,
    movement: 0, isToken: false, effectText, effectIds: [effectId], summonedThisTurn: false, movedThisTurn: false
  };
}
