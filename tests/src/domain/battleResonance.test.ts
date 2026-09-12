import {
  BATTLE_LANES,
  GameEngine,
  createInitialBattleBoard,
  createEmptyResonance,
  getEffectiveCreatureAttack,
  getEffectiveCreatureCurrentHp,
  getEffectiveCreatureMaxHp,
  getEffectiveCreatureMovement,
  getCreaturePlayCost,
  increaseResonance,
  placeCreatureForTest,
  projectPublicBattleView,
  resonanceGain,
  resolveAfterPlayPhase,
  resolveStandbyPhase,
  type BattleCardInstance,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("resonance", () => {
  it("maintains the complete 3 by 5 map within 0 through 15", () => {
    const initial = createEmptyResonance();
    expect(BATTLE_LANES.flatMap((lane) => Object.values(initial[lane]))).toEqual(Array(15).fill(0));
    expect(increaseResonance(initial, "left", "fire", 99).left.fire).toBe(15);
    expect(resonanceGain(1)).toBe(1);
    expect(resonanceGain(3)).toBe(3);
    expect(resonanceGain(9)).toBe(9);
  });

  it("uses the full original cost for creature resonance", () => {
    const state = summonableState(6);
    const result = GameEngine.submitCommand(state, {
      type: "summonCreature", side: "player", handInstanceId: "resonance-creature", destination: { column: 5, row: 9 }
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.players.player.resonance.center.fire).toBe(6);
  });

  it("adds one spell resonance to every lane regardless of its cost", () => {
    const state = spellState(6);
    const result = GameEngine.submitCommand(state, { type: "castSpell", side: "player", handInstanceId: "resonance-spell" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const lane of BATTLE_LANES) expect(result.state.players.player.resonance[lane].water).toBe(1);
    expect(result.events.map((event) => event.type)).toEqual(["spell.resolved", "resonance.changed", "resonance.changed", "resonance.changed"]);
    expect(result.events.some((event) => event.type === "effect.fizzled")).toBe(false);
  });

  it("preserves resonance values when a turn starts", () => {
    const state = withResonance(baseState(), "player", "center", "fire", 11);
    const result = resolveStandbyPhase(state, "player", 100);

    expect(result.state.players.player.resonance.center.fire).toBe(11);
    expect(result.events.some((event) => event.type === "resonance.changed")).toBe(false);
  });

  it("derives the fire bonus for allied creatures in an active lane without mutating their attack", () => {
    const state = boardCreatureState();
    const activeState: BattleState = {
      ...state,
      players: {
        ...state.players,
        player: {
          ...state.players.player,
          resonance: increaseResonance(state.players.player.resonance, "center", "fire", 15)
        }
      }
    };
    const creature = activeState.cardInstances["fire-resonance-creature"] as BattleCardInstance;
    const ally = activeState.cardInstances["fire-resonance-ally"] as BattleCardInstance;

    expect(getEffectiveCreatureAttack(activeState, creature)).toBe(3);
    expect(getEffectiveCreatureAttack(activeState, ally)).toBe(5);
    expect(projectPublicBattleView(activeState).boardSquares.find((square) => square.key === "5:8")?.occupant?.currentAttack).toBe(3);
    expect(projectPublicBattleView(activeState).boardSquares.find((square) => square.key === "6:8")?.occupant?.currentAttack).toBe(5);
    expect(activeState.cardInstances[creature.instanceId]?.currentAttack).toBe(2);
    expect(activeState.cardInstances[ally.instanceId]?.currentAttack).toBe(4);
  });

  it("recalculates the fire bonus after a lane move and after resonance falls below the threshold", () => {
    const state = boardCreatureState();
    const activeState: BattleState = {
      ...state,
      players: {
        ...state.players,
        player: {
          ...state.players.player,
          resonance: increaseResonance(state.players.player.resonance, "center", "fire", 15)
        }
      }
    };
    const creature = activeState.cardInstances["fire-resonance-creature"] as BattleCardInstance;
    const movedCreature: BattleCardInstance = {
      ...creature,
      position: { column: 3, row: 8 }
    };
    const movedState: BattleState = {
      ...activeState,
      cardInstances: { ...activeState.cardInstances, [movedCreature.instanceId]: movedCreature }
    };
    const inactiveState: BattleState = {
      ...activeState,
      players: {
        ...activeState.players,
        player: {
          ...activeState.players.player,
          resonance: { ...activeState.players.player.resonance, center: { ...activeState.players.player.resonance.center, fire: 14 } }
        }
      }
    };

    expect(getEffectiveCreatureAttack(movedState, movedCreature)).toBe(2);
    expect(getEffectiveCreatureAttack(inactiveState, creature)).toBe(2);
    expect(inactiveState.cardInstances[creature.instanceId]?.currentAttack).toBe(2);
  });

  it("automatically boosts the first creature to move in an active lane and removes it at turn end", () => {
    const state = withResonance(boardCreatureState(), "player", "center", "water", 15);
    expect(projectPublicBattleView(state).boardSquares.find((square) => square.key === "5:8")?.occupant?.movement).toBe(1);
    const result = GameEngine.submitCommand(state, {
      type: "moveCreature",
      side: "player",
      creatureInstanceId: "fire-resonance-creature",
      origin: { column: 5, row: 8 },
      path: [{ column: 5, row: 7 }, { column: 5, row: 6 }]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cardInstances["fire-resonance-creature"]?.temporaryMovementBonus).toBe(1);
    expect(projectPublicBattleView(result.state).boardSquares.find((square) => square.key === "5:6")?.occupant?.movement).toBe(2);
    expect(result.state.players.player.resonanceUsage.water.center).toBe(true);
    const secondMove = GameEngine.submitCommand(result.state, {
      type: "moveCreature",
      side: "player",
      creatureInstanceId: "fire-resonance-ally",
      origin: { column: 6, row: 8 },
      path: [{ column: 6, row: 7 }]
    });
    expect(secondMove).toMatchObject({ ok: true });
    if (secondMove.ok) expect(secondMove.state.cardInstances["fire-resonance-ally"]?.temporaryMovementBonus).toBeUndefined();

    const ended = GameEngine.submitCommand(secondMove.ok ? secondMove.state : result.state, {
      type: "endPlayPhase",
      side: "player",
      reason: "manual"
    });
    expect(ended.ok).toBe(true);
    if (ended.ok) expect(ended.state.cardInstances["fire-resonance-creature"]?.temporaryMovementBonus).toBeUndefined();
  });

  it("consumes wind resonance for the first summon even when the one-cost floor prevents a reduction", () => {
    const state = withResonance(summonableState(2), "player", "center", "wind", 15);
    const affordableState: BattleState = {
      ...state,
      players: { ...state.players, player: { ...state.players.player, currentPp: 1 } }
    };
    const card = affordableState.cardInstances["resonance-creature"] as BattleCardInstance;

    expect(getCreaturePlayCost(affordableState, "player", card, "center")).toBe(1);
    const result = GameEngine.submitCommand(affordableState, {
      type: "summonCreature", side: "player", handInstanceId: card.instanceId, destination: { column: 5, row: 9 }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.players.player.currentPp).toBe(0);
      expect(result.state.players.player.resonanceUsage.wind.center).toBe(true);
    }
  });

  it("AK-004/009/013/021/028/036/043 derive their continuous values from the current board", () => {
    const state = continuousEffectState();
    const active = withResonance(withResonance(withResonance(state, "player", "center", "fire", 15), "player", "left", "wind", 15), "player", "center", "wind", 15);
    const berserker = active.cardInstances["ak-004"]!;
    const seeker = active.cardInstances["ak-013"]!;
    const token = active.cardInstances["ak-token"]!;
    const sprite: BattleCardInstance = { ...seeker, catalogCardId: "AK-028", currentCost: 3 };
    const giant: BattleCardInstance = { ...seeker, catalogCardId: "AK-036", currentCost: 10 };

    expect(getEffectiveCreatureAttack(active, berserker)).toBe(7); // 3 + fire + AK-004 + AK-009
    expect(getEffectiveCreatureMovement(active, seeker)).toBe(3); // AK-013's two steps + AK-021
    expect(getEffectiveCreatureAttack(active, token)).toBe(4); // base + fire + AK-009 + AK-043
    expect(getEffectiveCreatureCurrentHp(active, token)).toBe(3);
    expect(getEffectiveCreatureMaxHp(active, token)).toBe(3);
    expect(getCreaturePlayCost(active, "player", sprite, "right")).toBe(1);
    expect(getCreaturePlayCost(active, "player", giant, "right")).toBe(4);
  });

  it("heals each active light lane's allies and owned bases, including the player base once per lane", () => {
    const state = lightResonanceState();
    const result = resolveAfterPlayPhase(state, "player", 100);

    expect(result.state.cardInstances["light-left"]?.currentHp).toBe(2);
    expect(result.state.cardInstances["light-center"]?.currentHp).toBe(3);
    expect(result.state.bases["player-base"].currentHp).toBe(19);
    expect(result.state.bases["neutral-left"].currentHp).toBe(9);
    expect(result.state.bases["neutral-center"].currentHp).toBe(8);
  });

  it("resets active dark lanes for both sides at every player-turn start and resets on activation", () => {
    const state = withResonance(withResonance(baseState(), "player", "center", "dark", 15), "cpu", "center", "dark", 15);
    const usedState: BattleState = {
      ...state,
      players: {
        ...state.players,
        player: { ...state.players.player, resonanceUsage: { ...state.players.player.resonanceUsage, dark: { ...state.players.player.resonanceUsage.dark, center: true } } },
        cpu: { ...state.players.cpu, resonanceUsage: { ...state.players.cpu.resonanceUsage, dark: { ...state.players.cpu.resonanceUsage.dark, center: true } } }
      }
    };
    const standby = resolveStandbyPhase(usedState, "cpu", 100);

    expect(standby.state.players.player.resonanceUsage.dark.center).toBe(false);
    expect(standby.state.players.cpu.resonanceUsage.dark.center).toBe(false);

    const inactiveDark = withResonance(summonableState(1), "player", "center", "dark", 14);
    const reactivatingState: BattleState = {
      ...inactiveDark,
      cardInstances: {
        ...inactiveDark.cardInstances,
        "resonance-creature": { ...inactiveDark.cardInstances["resonance-creature"]!, attribute: "dark" }
      },
      players: {
        ...inactiveDark.players,
        player: { ...inactiveDark.players.player, resonanceUsage: { ...inactiveDark.players.player.resonanceUsage, dark: { ...inactiveDark.players.player.resonanceUsage.dark, center: true } } }
      }
    };
    const reactivated = GameEngine.submitCommand(reactivatingState, {
      type: "summonCreature", side: "player", handInstanceId: "resonance-creature", destination: { column: 5, row: 9 }
    });
    expect(reactivated).toMatchObject({ ok: true });
    if (reactivated.ok) expect(reactivated.state.players.player.resonanceUsage.dark.center).toBe(false);
  });
});

function baseState(): BattleState {
  return fc.sample(battleStateArbitrary, { numRuns: 1, seed: 260810 })[0];
}

function summonableState(cost: number): BattleState {
  const state = baseState();
  const source = Object.values(state.cardInstances).find((card) => card.ownerSide === "player") as BattleCardInstance;
  const card: BattleCardInstance = { ...source, instanceId: "resonance-creature", type: "creature", attribute: "fire", cost, currentCost: cost, zone: "hand", position: undefined, attack: 1, currentAttack: 1, health: 1, currentHp: 1, maxHp: 1, movement: 1, isToken: false, summonedThisTurn: false, movedThisTurn: false };
  return { ...state, phase: "play", activeSide: "player", players: { ...state.players, player: { ...state.players.player, currentPp: 10, handZone: [card.instanceId] } }, cardInstances: { ...state.cardInstances, [card.instanceId]: card } };
}

function spellState(cost: number): BattleState {
  const state = baseState();
  const source = Object.values(state.cardInstances).find((card) => card.ownerSide === "player") as BattleCardInstance;
  const card: BattleCardInstance = { ...source, instanceId: "resonance-spell", type: "spell", attribute: "water", cost, currentCost: cost, zone: "hand", position: undefined, movement: 0, isToken: false, summonedThisTurn: false, movedThisTurn: false };
  return { ...state, phase: "play", activeSide: "player", players: { ...state.players, player: { ...state.players.player, currentPp: 10, handZone: [card.instanceId] } }, cardInstances: { ...state.cardInstances, [card.instanceId]: card } };
}

function boardCreatureState(): BattleState {
  const state = baseState();
  const source = Object.values(state.cardInstances).find((card) => card.ownerSide === "player") as BattleCardInstance;
  const creature: BattleCardInstance = {
    ...source,
    instanceId: "fire-resonance-creature",
    type: "creature",
    attribute: "fire",
    zone: "board",
    position: { column: 5, row: 8 },
    attack: 2,
    currentAttack: 2,
    health: 2,
    currentHp: 2,
    maxHp: 2,
    movement: 1,
    isToken: false,
    summonedThisTurn: false,
    movedThisTurn: false
  };
  const ally: BattleCardInstance = {
    ...creature,
    instanceId: "fire-resonance-ally",
    position: { column: 6, row: 8 },
    attack: 4,
    currentAttack: 4
  };
  return {
    ...state,
    phase: "play",
    activeSide: "player",
    board: {
      squares: state.board.squares.map((square) =>
        square.coordinate.row === 8 && square.coordinate.column === 5
          ? { ...square, occupantId: creature.instanceId }
          : square.coordinate.row === 8 && square.coordinate.column === 6
            ? { ...square, occupantId: ally.instanceId }
            : square
      )
    },
    cardInstances: {
      ...state.cardInstances,
      [creature.instanceId]: creature,
      [ally.instanceId]: ally
    }
  };
}

function continuousEffectState(): BattleState {
  const state = baseState();
  const source = Object.values(state.cardInstances).find((card) => card.ownerSide === "player") as BattleCardInstance;
  const make = (instanceId: string, catalogCardId: string, column: number, row: number, isToken = false): BattleCardInstance => ({
    ...source, instanceId, catalogCardId, type: isToken ? "creature-token" : "creature", zone: "hand", position: undefined,
    attack: isToken ? 1 : 3, currentAttack: isToken ? 1 : 3, health: isToken ? 1 : 4, currentHp: isToken ? 1 : 4, maxHp: isToken ? 1 : 4,
    movement: 1, isToken, summonedThisTurn: false, movedThisTurn: false
  });
  const cards = [
    make("ak-004", "AK-004", 5, 8), make("ak-009", "AK-009", 6, 8), make("ak-013", "AK-013", 7, 8),
    make("ak-021", "AK-021", 5, 7), make("ak-043", "AK-043", 6, 7), make("ak-token", "AK-T-001", 5, 9, true)
  ];
  let next: BattleState = { ...state, board: createInitialBattleBoard(), cardInstances: { ...state.cardInstances, ...Object.fromEntries(cards.map((card) => [card.instanceId, card])) } };
  for (const [index, card] of cards.entries()) next = placeCreatureForTest(next, card.instanceId, "player", card.position?.column ?? [5, 6, 7, 5, 6, 5][index]!, card.position?.row ?? [8, 8, 8, 7, 7, 9][index]!);
  return next;
}

function withResonance(
  state: BattleState,
  side: "player" | "cpu",
  lane: "left" | "center" | "right",
  attribute: "fire" | "water" | "wind" | "light" | "dark",
  amount: number
): BattleState {
  return {
    ...state,
    players: {
      ...state.players,
      [side]: {
        ...state.players[side],
        resonance: increaseResonance(state.players[side].resonance, lane, attribute, amount)
      }
    }
  };
}

function lightResonanceState(): BattleState {
  const state = baseState();
  const [leftId, centerId] = Object.values(state.cardInstances)
    .filter((card) => card.ownerSide === "player")
    .map((card) => card.instanceId);
  if (!leftId || !centerId) throw new Error("Expected player creatures.");
  const leftPlaced = placeCreatureForTest(state, leftId, "player", 3, 8);
  const centerPlaced = placeCreatureForTest(leftPlaced, centerId, "player", 6, 8);
  const cardInstances = { ...centerPlaced.cardInstances };
  delete cardInstances[leftId];
  delete cardInstances[centerId];
  const withCards: BattleState = {
    ...centerPlaced,
    cardInstances: {
      ...cardInstances,
      "light-left": { ...centerPlaced.cardInstances[leftId]!, instanceId: "light-left", currentHp: 1, maxHp: 3, health: 3, summonedThisTurn: false },
      "light-center": { ...centerPlaced.cardInstances[centerId]!, instanceId: "light-center", currentHp: 2, maxHp: 4, health: 4, summonedThisTurn: false }
    },
    board: {
      squares: centerPlaced.board.squares.map((square) =>
        square.occupantId === leftId ? { ...square, occupantId: "light-left" }
          : square.occupantId === centerId ? { ...square, occupantId: "light-center" }
            : square
      )
    },
    bases: {
      ...centerPlaced.bases,
      "player-base": { ...centerPlaced.bases["player-base"], currentHp: 17 },
      "neutral-left": { ...centerPlaced.bases["neutral-left"], owner: "player", currentHp: 8 },
      "neutral-center": { ...centerPlaced.bases["neutral-center"], owner: "cpu", currentHp: 8 }
    }
  };
  return withResonance(withResonance(withCards, "player", "left", "light", 15), "player", "center", "light", 15);
}
