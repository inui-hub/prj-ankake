import {
  BATTLE_LANES,
  GameEngine,
  createEmptyResonance,
  decayResonance,
  getEffectiveCreatureAttack,
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
  it("maintains the complete 3 by 5 map within 0 through 10", () => {
    const initial = createEmptyResonance();
    expect(BATTLE_LANES.flatMap((lane) => Object.values(initial[lane]))).toEqual(Array(15).fill(0));
    expect(increaseResonance(initial, "left", "fire", 99).left.fire).toBe(10);
    expect(decayResonance(initial).center.water).toBe(0);
    expect(resonanceGain(1)).toBe(1);
    expect(resonanceGain(3)).toBe(3);
    expect(resonanceGain(9)).toBe(3);
  });

  it("uses original cost for creature resonance, including a cost below three", () => {
    const state = summonableState(2);
    const result = GameEngine.submitCommand(state, {
      type: "summonCreature", side: "player", handInstanceId: "resonance-creature", destination: { column: 5, row: 9 }
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.players.player.resonance.center.fire).toBe(2);
  });

  it("adds a spell's original-cost resonance to every lane without running its intrinsic effect", () => {
    const state = spellState(6);
    const result = GameEngine.submitCommand(state, { type: "castSpell", side: "player", handInstanceId: "resonance-spell" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const lane of BATTLE_LANES) expect(result.state.players.player.resonance[lane].water).toBe(3);
    expect(result.events.map((event) => event.type)).toEqual(["spell.resolved", "resonance.changed", "resonance.changed", "resonance.changed"]);
    expect(result.events.some((event) => event.type === "effect.fizzled")).toBe(false);
  });

  it("derives the fire bonus for allied creatures in an active lane without mutating their attack", () => {
    const state = boardCreatureState();
    const activeState: BattleState = {
      ...state,
      players: {
        ...state.players,
        player: {
          ...state.players.player,
          resonance: increaseResonance(state.players.player.resonance, "center", "fire", 5)
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
          resonance: increaseResonance(state.players.player.resonance, "center", "fire", 5)
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
          resonance: { ...activeState.players.player.resonance, center: { ...activeState.players.player.resonance.center, fire: 4 } }
        }
      }
    };

    expect(getEffectiveCreatureAttack(movedState, movedCreature)).toBe(2);
    expect(getEffectiveCreatureAttack(inactiveState, creature)).toBe(2);
    expect(inactiveState.cardInstances[creature.instanceId]?.currentAttack).toBe(2);
  });

  it("allows one water boost per active lane during its controller's turn and removes it at turn end", () => {
    const state = withResonance(boardCreatureState(), "player", "center", "water", 5);
    const result = GameEngine.submitCommand(state, {
      type: "boostCreatureMovement",
      side: "player",
      creatureInstanceId: "fire-resonance-creature"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cardInstances["fire-resonance-creature"]?.temporaryMovementBonus).toBe(1);
    expect(projectPublicBattleView(result.state).boardSquares.find((square) => square.key === "5:8")?.occupant?.movement).toBe(2);
    expect(result.state.players.player.resonanceUsage.water.center).toBe(true);
    expect(GameEngine.submitCommand(result.state, {
      type: "boostCreatureMovement",
      side: "player",
      creatureInstanceId: "fire-resonance-ally"
    })).toMatchObject({ ok: false, issues: [{ code: "battle.resonance.already-used" }] });

    const ended = GameEngine.submitCommand(result.state, {
      type: "endPlayPhase",
      side: "player",
      reason: "manual"
    });
    expect(ended.ok).toBe(true);
    if (ended.ok) expect(ended.state.cardInstances["fire-resonance-creature"]?.temporaryMovementBonus).toBeUndefined();
  });

  it("consumes wind resonance for the first summon even when the one-cost floor prevents a reduction", () => {
    const state = withResonance(summonableState(2), "player", "center", "wind", 5);
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
    const state = withResonance(withResonance(baseState(), "player", "center", "dark", 5), "cpu", "center", "dark", 5);
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

    const inactiveDark = withResonance(summonableState(1), "player", "center", "dark", 4);
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
  return withResonance(withResonance(withCards, "player", "left", "light", 5), "player", "center", "light", 5);
}
