import {
  GameEngine,
  createBattleState,
  createInitialBattleBoard,
  generateLegalActions,
  placeCreatureForTest,
  projectPublicBattleView,
  type BattleCardInstance,
  type BattleSide,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";

describe("battle effect integration", () => {
  it("requires and resolves a selected target for a targeted summon effect", () => {
    const { state, spellId, enemyId } = createTargetedSpellState();
    const source: BattleCardInstance = {
      ...state.cardInstances[spellId]!,
      type: "creature",
      catalogCardId: "AK-003",
      effectIds: ["AK-003.primary"],
      effectText: "召喚時：敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に1ダメージを与える。",
      attack: 2,
      currentAttack: 2,
      health: 3,
      currentHp: 3,
      maxHp: 3,
      movement: 1
    };
    const withSource = { ...state, cardInstances: { ...state.cardInstances, [spellId]: source } };

    const withoutTarget = GameEngine.submitCommand(withSource, {
      type: "summonCreature", side: "player", handInstanceId: spellId, destination: { column: 3, row: 9 }
    });
    expect(withoutTarget).toMatchObject({ ok: true });
    if (!withoutTarget.ok) return;
    expect(withoutTarget.state.cardInstances[spellId]).toMatchObject({ zone: "board", position: { column: 3, row: 9 } });
    expect(withoutTarget.state.cardInstances[enemyId]?.currentHp).toBe(6);
    expect(withoutTarget.effect).toBeUndefined();
    expect(withoutTarget.events.map((event) => event.type)).toEqual(["creature.summoned", "resonance.changed"]);

    const result = GameEngine.submitCommand(withSource, {
      type: "summonCreature", side: "player", handInstanceId: spellId, destination: { column: 3, row: 9 }, effectSelection: { creatureIds: [enemyId] }
    });
    expect(result).toMatchObject({ ok: true, effect: { status: "resolved", completedOperationCount: 1 } });
    if (!result.ok) return;
    expect(result.state.cardInstances[enemyId]?.currentHp).toBe(5);
  });

  it("builds structured selections for scripted legal spell actions", () => {
    const { state, spellId } = createTargetedSpellState();
    const scripted: BattleState = { ...state, cardInstances: { ...state.cardInstances, [spellId]: { ...state.cardInstances[spellId]!, catalogCardId: "AK-011", effectIds: ["AK-011.primary"], effectText: "レーンを1つ選択する。" } } };
    const action = generateLegalActions(scripted, "player").find((candidate) => candidate.command.type === "castSpell");
    expect(action?.command).toMatchObject({ type: "castSpell", effectSelection: { lane: expect.any(String) } });
  });

  it("executes every declared effect ID in catalog order", () => {
    const { state, spellId } = createTargetedSpellState();
    const source = state.cardInstances[spellId]!;
    const doubleEffect = { ...source, catalogCardId: "AK-016", effectIds: ["first", "second"], effectText: "召喚時：カードを1枚引く。" };
    const result = GameEngine.submitCommand({ ...state, cardInstances: { ...state.cardInstances, [spellId]: doubleEffect } }, {
      type: "castSpell", side: "player", handInstanceId: spellId
    });

    expect(result).toMatchObject({ ok: true, effect: { status: "resolved", completedOperationCount: 2 } });
    if (!result.ok) return;
    expect(result.events.filter((event) => event.data?.effectId === "first" || event.data?.effectId === "second").map((event) => event.data?.effectId)).toEqual(["first", "second"]);
  });

  it("uses one legal-target source for projection, CPU actions, and resolver-backed commands", () => {
    const { state, spellId, enemyId } = createTargetedSpellState();
    const choices = projectPublicBattleView(state).effectChoices;
    const choice = choices.find((candidate) => candidate.sourceInstanceId === spellId);

    expect(choice?.candidates).toContainEqual({
      kind: "creature",
      id: enemyId,
      label: state.cardInstances[enemyId]?.name
    });

    const action = generateLegalActions(state, "player").find(
      (candidate) => candidate.command.type === "castSpell" && candidate.command.targetInstanceId === enemyId
    );
    expect(action).toBeDefined();
    if (!action) return;

    const result = GameEngine.submitCommand(state, action.command);
    expect(result).toMatchObject({ ok: true, effect: { status: "resolved", completedOperationCount: 1 } });
    if (!result.ok) return;
    expect(result.state.cardInstances[enemyId]?.currentHp).toBe(4);
    expect(result.events.some((event) => event.data?.effectId === "AK-002.primary")).toBe(true);
  });

  it("rejects stale effect targets without spending the spell", () => {
    const { state, spellId } = createTargetedSpellState();
    const result = GameEngine.submitCommand(state, {
      type: "castSpell",
      side: "player",
      handInstanceId: spellId,
      targetInstanceId: "missing-target"
    });

    expect(result).toMatchObject({ ok: false });
    expect(result.state).toBe(state);
    if (!result.ok) expect(result.issues[0]?.code).toBe("battle.effect.no-target");
  });

  it("does not cast a targeted spell when no legal target exists", () => {
    const { state, spellId, enemyId } = createTargetedSpellState();
    const silenceSpell: BattleCardInstance = {
      ...state.cardInstances[spellId]!,
      catalogCardId: "AK-041",
      effectIds: ["AK-041.primary"],
      effectText: "敵クリーチャー1体を選択する。そのクリーチャーの効果を無効にする。"
    };
    const enemy = { ...state.cardInstances[enemyId]!, zone: "hand" as const, position: undefined };
    const withoutTargets: BattleState = {
      ...state,
      board: createInitialBattleBoard(),
      players: { ...state.players, cpu: { ...state.players.cpu, handZone: [enemyId] } },
      cardInstances: { ...state.cardInstances, [spellId]: silenceSpell, [enemyId]: enemy }
    };

    const result = GameEngine.submitCommand(withoutTargets, {
      type: "castSpell", side: "player", handInstanceId: spellId
    });
    expect(result).toMatchObject({ ok: false, issues: [{ code: "battle.effect.no-target" }] });
    expect(result.state).toBe(withoutTargets);
  });

  it("rejects an unknown card script instead of treating it as a successful no-op", () => {
    const { state, spellId } = createTargetedSpellState();
    const unknown = { ...state.cardInstances[spellId]!, catalogCardId: "AK-999", effectIds: ["AK-999.primary"], effectText: "Unknown scripted effect." };
    const result = GameEngine.submitCommand({ ...state, cardInstances: { ...state.cardInstances, [spellId]: unknown } }, {
      type: "castSpell", side: "player", handInstanceId: spellId
    });

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.issues[0]?.code).toBe("battle.effect.unsupported");
  });

  it("does not expose an opponent creature's card name in AK-019 effect choices", () => {
    const { state, spellId, enemyId } = createTargetedSpellState();
    const secretName = "CPU_SECRET_CARD_NAME";
    const selectionState: BattleState = {
      ...state,
      cardInstances: {
        ...state.cardInstances,
        [spellId]: {
          ...state.cardInstances[spellId]!,
          catalogCardId: "AK-019",
          effectIds: ["AK-019.primary"]
        },
        [enemyId]: { ...state.cardInstances[enemyId]!, name: secretName }
      }
    };

    const choice = projectPublicBattleView(selectionState).effectChoices.find(
      (candidate) => candidate.sourceInstanceId === spellId
    );
    const opponentCandidate = choice?.candidates.find(
      (candidate) => candidate.kind === "creature" && candidate.id === enemyId
    );

    expect(opponentCandidate?.label).toMatch(/^Opponent creature \d+$/);
    expect(choice?.candidates.some((candidate) => candidate.label.includes(secretName))).toBe(false);
  });

  it.each(["player", "cpu"] as const)("builds a creature and same-lane cell selection for %s AK-019 CPU actions", (side) => {
    const { state, spellId, creatureId } = createAk019LegalActionState(side);
    const action = generateLegalActions(state, side).find(
      (candidate) => candidate.command.type === "castSpell" && candidate.command.handInstanceId === spellId
    );

    expect(action?.command).toMatchObject({
      type: "castSpell",
      effectSelection: { creatureIds: [creatureId], coordinates: [{ column: expect.any(Number), row: expect.any(Number) }] }
    });
    if (action?.command.type !== "castSpell") return;
    const coordinate = action.command.effectSelection?.coordinates?.[0];
    expect(action.command.effectSelection?.creatureIds).toEqual([creatureId]);
    expect(action.command.effectSelection?.coordinates).toHaveLength(1);
    expect(coordinate).toBeDefined();
    if (coordinate) expect(laneForColumn(coordinate.column)).toBe(laneForColumn(state.cardInstances[creatureId]?.position!.column ?? 0));
  });

  it.each(["player", "cpu"] as const)("selects exactly one eligible graveyard creature and cell for %s AK-057 summons", (side) => {
    const { state, summonId, eligibleId } = createAk057LegalActionState(side, true);
    const actions = generateLegalActions(state, side).filter(
      (candidate) => candidate.command.type === "summonCreature" && candidate.command.handInstanceId === summonId
    );

    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      if (action.command.type !== "summonCreature") continue;
      expect(action.command.effectSelection?.graveyardCardIds).toEqual([eligibleId]);
      expect(action.command.effectSelection?.coordinates).toHaveLength(1);
    }
  });

  it.each(["player", "cpu"] as const)("allows %s AK-057 to summon without resolving its effect when its graveyard has no eligible creature", (side) => {
    const { state, summonId } = createAk057LegalActionState(side, false);
    const actions = generateLegalActions(state, side).filter(
      (candidate) => candidate.command.type === "summonCreature" && candidate.command.handInstanceId === summonId
    );

    expect(actions).toHaveLength(6);
    expect(actions.every((action) => action.command.type === "summonCreature" && action.command.effectSelection === undefined)).toBe(true);
  });

  it("AK-059 revives exactly the selected two eligible graveyard creatures onto selected summon squares", () => {
    const sampled = fc.sample(battleStateArbitrary, { numRuns: 1, seed: 59059 })[0]!;
    const [first, second, spellSource] = Object.values(sampled.cardInstances).filter((card) => card.ownerSide === "player");
    if (!first || !second || !spellSource) throw new Error("Fixture requires three player cards.");
    const revive = (card: BattleCardInstance, instanceId: string): BattleCardInstance => ({ ...card, instanceId, type: "creature", zone: "graveyard", position: undefined, cost: 5, currentCost: 5, attack: 2, currentAttack: 2, health: 3, currentHp: 0, maxHp: 3, movement: 1, isToken: false, summonedThisTurn: false, movedThisTurn: false });
    const fallenOne = revive(first, "fallen-one");
    const fallenTwo = revive(second, "fallen-two");
    const gate: BattleCardInstance = { ...spellSource, instanceId: "resurrection-gate", catalogCardId: "AK-059", type: "spell", zone: "hand", position: undefined, cost: 8, currentCost: 8, movement: 0, isToken: false, effectText: "自分の墓地の元のコストが5以下のクリーチャーカード2枚を選択する。空いている召喚可能マスを2つ選択する。そのカードを選択したマスに1枚ずつ出す。", effectIds: ["AK-059.primary"], summonedThisTurn: false, movedThisTurn: false };
    const state: BattleState = { ...sampled, phase: "play", activeSide: "player", terminalResult: undefined, board: createInitialBattleBoard(), players: { ...sampled.players, player: { ...sampled.players.player, currentPp: 10, handZone: [gate.instanceId], graveyardZone: [fallenOne.instanceId, fallenTwo.instanceId] } }, cardInstances: { ...sampled.cardInstances, [gate.instanceId]: gate, [fallenOne.instanceId]: fallenOne, [fallenTwo.instanceId]: fallenTwo } };

    const result = GameEngine.submitCommand(state, { type: "castSpell", side: "player", handInstanceId: gate.instanceId, effectSelection: { graveyardCardIds: [fallenOne.instanceId, fallenTwo.instanceId], coordinates: [{ column: 4, row: 9 }, { column: 5, row: 9 }] } });

    expect(result).toMatchObject({ ok: true, effect: { status: "resolved" } });
    if (!result.ok) return;
    expect(result.state.players.player.graveyardZone).not.toContain(fallenOne.instanceId);
    expect(result.state.players.player.graveyardZone).not.toContain(fallenTwo.instanceId);
    expect(result.state.cardInstances[fallenOne.instanceId]).toMatchObject({ zone: "board", position: { column: 4, row: 9 }, currentHp: 3 });
    expect(result.state.cardInstances[fallenTwo.instanceId]).toMatchObject({ zone: "board", position: { column: 5, row: 9 }, currentHp: 3 });
  });

  it("AK-060 destroys every other creature in its lane and grows once per destruction", () => {
    const sourceId = "ak060-source";
    const allyId = "ak060-ally";
    const enemyId = "ak060-enemy";
    const state = createDeterministicLegalActionState("player", {
      [sourceId]: createEffectTestCard(sourceId, "player", "creature", "hand", "AK-060", 1, ["AK-060.primary"]),
      [allyId]: createEffectTestCard(allyId, "player", "creature", "hand", "AK-001", 1),
      [enemyId]: createEffectTestCard(enemyId, "cpu", "creature", "hand", "AK-001", 1)
    }, [sourceId], []);
    const withAlly = placeCreatureForTest(state, allyId, "player", 4, 9);
    const withVictims = placeCreatureForTest(withAlly, enemyId, "cpu", 2, 8);

    const result = GameEngine.submitCommand(withVictims, { type: "summonCreature", side: "player", handInstanceId: sourceId, destination: { column: 3, row: 9 } });

    expect(result).toMatchObject({ ok: true, effect: { status: "resolved" } });
    if (!result.ok) return;
    expect(result.state.cardInstances[allyId]?.zone).toBe("graveyard");
    expect(result.state.cardInstances[enemyId]?.zone).toBe("graveyard");
    expect(result.state.cardInstances[sourceId]).toMatchObject({ currentAttack: 4, currentHp: 5, maxHp: 5 });
  });

  it("filters structured candidates and CPU selections to combinations accepted by validation", () => {
    const spellId = "ak059";
    const validOne = "valid-one";
    const validTwo = "valid-two";
    const invalid = "invalid-spell";
    const state = createDeterministicLegalActionState("player", {
      [spellId]: createEffectTestCard(spellId, "player", "spell", "hand", "AK-059", 1, ["AK-059.primary"]),
      [validOne]: createEffectTestCard(validOne, "player", "creature", "graveyard", "AK-001", 5),
      [validTwo]: createEffectTestCard(validTwo, "player", "creature-token", "graveyard", "AK-T-001", 3),
      [invalid]: createEffectTestCard(invalid, "player", "spell", "graveyard", "AK-002", 1)
    }, [spellId], [validOne, validTwo, invalid]);
    const choice = projectPublicBattleView(state).effectChoices.find((entry) => entry.sourceInstanceId === spellId);
    const graveIds = choice?.candidates.filter((candidate) => candidate.kind === "graveyard").map((candidate) => candidate.id);
    const action = generateLegalActions(state, "player").find((entry) => entry.command.type === "castSpell" && entry.command.handInstanceId === spellId);

    expect(graveIds).toEqual([validOne, validTwo]);
    expect(choice?.candidates.filter((candidate) => candidate.kind === "coordinate").length).toBeGreaterThanOrEqual(2);
    expect(action?.command).toMatchObject({ effectSelection: { graveyardCardIds: [validOne, validTwo], coordinates: [{ column: expect.any(Number), row: expect.any(Number) }, { column: expect.any(Number), row: expect.any(Number) }] } });
    if (action?.command.type === "castSpell") expect(GameEngine.submitCommand(state, action.command)).toMatchObject({ ok: true });
  });

  it("keeps spell lifecycle event sequences strictly increasing", () => {
    const { state, spellId, enemyId } = createTargetedSpellState();
    const doomed = { ...state.cardInstances[enemyId]!, catalogCardId: "AK-049", effectIds: ["AK-049.primary"], currentHp: 2, maxHp: 2 };
    const result = GameEngine.submitCommand({ ...state, cardInstances: { ...state.cardInstances, [enemyId]: doomed } }, { type: "castSpell", side: "player", handInstanceId: spellId, targetInstanceId: enemyId });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    const sequences = result.events.map((event) => event.sequence);
    expect(new Set(sequences).size).toBe(sequences.length);
    expect(sequences).toEqual([...sequences].sort((left, right) => left - right));
  });
});

function createTargetedSpellState(): { readonly state: BattleState; readonly spellId: string; readonly enemyId: string } {
  const sampled = fc.sample(battleStateArbitrary, { numRuns: 1, seed: 9861 })[0]!;
  const playerCard = Object.values(sampled.cardInstances).find((card) => card.ownerSide === "player")!;
  const enemyCard = Object.values(sampled.cardInstances).find((card) => card.ownerSide === "cpu")!;
  const spell: BattleCardInstance = {
    ...playerCard,
    type: "spell",
    catalogCardId: "AK-002",
    effectText: "敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に2ダメージを与える。",
    effectIds: ["AK-002.primary"],
    zone: "hand",
    position: undefined,
    currentCost: 1,
    cost: 1,
    attack: undefined,
    currentAttack: undefined,
    health: undefined,
    currentHp: undefined,
    maxHp: undefined,
    summonedThisTurn: false,
    movedThisTurn: false
  };
  const enemy: BattleCardInstance = {
    ...enemyCard,
    type: "creature",
    zone: "hand",
    position: undefined,
    currentHp: 6,
    maxHp: 6,
    health: 6,
    summonedThisTurn: false,
    movedThisTurn: false
  };
  const prepared: BattleState = {
    ...sampled,
    phase: "play",
    activeSide: "player",
    terminalResult: undefined,
    board: createInitialBattleBoard(),
    players: {
      ...sampled.players,
      player: { ...sampled.players.player, handZone: [spell.instanceId], currentPp: 5 },
      cpu: { ...sampled.players.cpu, handZone: [enemy.instanceId] }
    },
    cardInstances: { ...sampled.cardInstances, [spell.instanceId]: spell, [enemy.instanceId]: enemy }
  };
  return { state: placeCreatureForTest(prepared, enemy.instanceId, "cpu", 5, 5), spellId: spell.instanceId, enemyId: enemy.instanceId };
}

function createAk019LegalActionState(side: BattleSide): { readonly state: BattleState; readonly spellId: string; readonly creatureId: string } {
  const spellId = `${side}-ak019`;
  const creatureId = `${side}-lane-creature`;
  const base = createDeterministicLegalActionState(side, {
    [spellId]: createEffectTestCard(spellId, side, "spell", "hand", "AK-019", 1, ["AK-019.primary"]),
    [creatureId]: createEffectTestCard(creatureId, side, "creature", "hand", "AK-001", 2)
  }, [spellId], []);
  return { state: placeCreatureForTest(base, creatureId, side, 5, 5), spellId, creatureId };
}

function createAk057LegalActionState(side: BattleSide, includesEligible: boolean): { readonly state: BattleState; readonly summonId: string; readonly eligibleId: string } {
  const summonId = `${side}-ak057`;
  const eligibleId = `${side}-eligible-graveyard`;
  const expensiveId = `${side}-expensive-graveyard`;
  const cards = {
    [summonId]: createEffectTestCard(summonId, side, "creature", "hand", "AK-057", 4, ["AK-057.primary"]),
    [eligibleId]: createEffectTestCard(eligibleId, side, "creature-token", "graveyard", "AK-T-001", 3),
    [expensiveId]: createEffectTestCard(expensiveId, side, "creature", "graveyard", "AK-002", 4)
  };
  return {
    state: createDeterministicLegalActionState(side, cards, [summonId], includesEligible ? [eligibleId, expensiveId] : [expensiveId]),
    summonId,
    eligibleId
  };
}

function createDeterministicLegalActionState(
  side: BattleSide,
  cards: Readonly<Record<string, BattleCardInstance>>,
  handZone: readonly string[],
  graveyardZone: readonly string[]
): BattleState {
  const deck = {
    deckId: "legal-action-fixture-deck",
    name: "Legal action fixture",
    cards: Array.from({ length: 10 }, (_, index) => ({ cardId: `AK-${String(index + 1).padStart(3, "0")}`, count: 4 })),
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z"
  };
  const result = createBattleState({
    playerDeck: deck,
    cpuDeck: deck,
    catalog: validCatalogSnapshotFixture,
    firstPlayerMode: side === "player" ? "player-first" : "player-second",
    seed: `legal-action-${side}`,
    now: "2026-08-15T00:00:00.000Z"
  });
  if (!result.ok) throw new Error("Deterministic legal-action fixture could not be created.");
  return {
    ...result.state,
    phase: "play",
    activeSide: side,
    board: createInitialBattleBoard(),
    players: {
      ...result.state.players,
      [side]: { ...result.state.players[side], handZone, graveyardZone, currentPp: 10 }
    },
    cardInstances: { ...result.state.cardInstances, ...cards }
  };
}

function createEffectTestCard(
  instanceId: string,
  side: BattleSide,
  type: BattleCardInstance["type"],
  zone: BattleCardInstance["zone"],
  catalogCardId: string,
  cost: number,
  effectIds: readonly string[] = []
): BattleCardInstance {
  const creature = type === "creature" || type === "creature-token";
  return {
    instanceId,
    catalogCardId,
    ownerSide: side,
    controllerSide: side,
    zone,
    name: catalogCardId,
    type,
    attribute: "fire",
    cost,
    currentCost: cost,
    ...(creature ? { attack: 2, currentAttack: 2, health: 3, currentHp: zone === "graveyard" ? 0 : 3, maxHp: 3 } : {}),
    movement: creature ? 1 : 0,
    isToken: type === "creature-token",
    effectText: effectIds.length > 0 ? `${catalogCardId} effect` : "なし",
    effectIds,
    summonedThisTurn: false,
    movedThisTurn: false
  };
}

function laneForColumn(column: number): "left" | "center" | "right" {
  return column <= 4 ? "left" : column >= 8 ? "right" : "center";
}
