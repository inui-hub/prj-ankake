import {
  BATTLE_BASE_IDS,
  getPublicEffectChoices,
  projectPublicBattleView,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("public battle projection", () => {
  it("projects the five bases in canonical order and associates only base squares", () => {
    const state = sampleBattleState();
    const view = projectPublicBattleView(state);

    expect(view.bases.map((base) => base.id)).toEqual(BATTLE_BASE_IDS);
    for (const base of view.bases) {
      expect(base).toMatchObject(state.bases[base.id]);
      const squareBase = view.boardSquares.find(
        (square) =>
          square.coordinate.column === base.coordinate.column &&
          square.coordinate.row === base.coordinate.row
      )?.base;
      expect(squareBase).toBe(base);
    }
    expect(view.boardSquares.filter((square) => square.base)).toHaveLength(5);
    expect(view.boardSquares.find((square) => square.key === "5:5")?.base).toBeUndefined();
    expect(view).not.toHaveProperty("playerBaseHp");
    expect(view).not.toHaveProperty("cpuBaseHp");
  });

  it("projects public resources without CPU hand identities or legal actions", () => {
    const state = sampleBattleState();
    const view = projectPublicBattleView(state);
    const serialized = JSON.stringify(view);

    expect(view.playerCurrentPp).toBe(state.players.player.currentPp);
    expect(view.playerMaxPp).toBe(state.players.player.maxPp);
    expect(view.cpuCurrentPp).toBe(state.players.cpu.currentPp);
    expect(view.cpuMaxPp).toBe(state.players.cpu.maxPp);
    expect(view.cpuResonance).toBe(state.players.cpu.resonance);
    expect(view.playerHand.map((card) => card.instanceId)).toEqual(
      state.players.player.handZone
    );
    expect(view.cpuHandCount).toBe(state.players.cpu.handZone.length);
    expect(view.playerGraveyard.map((card) => card.instanceId)).toEqual(state.players.player.graveyardZone);
    expect(view.cpuGraveyard.map((card) => card.instanceId)).toEqual(state.players.cpu.graveyardZone);
    expect(view).not.toHaveProperty("legalActions");

    for (const cpuHandInstanceId of state.players.cpu.handZone) {
      expect(serialized).not.toContain(cpuHandInstanceId);
    }
  });

  it("projects board occupants without exposing mutable battle instance fields", () => {
    const state = sampleBattleState();
    const creature = Object.values(state.cardInstances).find(
      (card) => card.ownerSide === "player" && card.type === "creature"
    );
    if (!creature) {
      throw new Error("Expected the fixture to include a player creature.");
    }

    const coordinate = { column: 5, row: 8 };
    const withOccupant: BattleState = {
      ...state,
      phase: "play",
      activeSide: "player",
      terminalResult: undefined,
      board: {
        squares: state.board.squares.map((square) =>
          square.coordinate.column === coordinate.column &&
          square.coordinate.row === coordinate.row
            ? { ...square, occupantId: creature.instanceId }
            : square
        )
      },
      cardInstances: {
        ...state.cardInstances,
        [creature.instanceId]: {
          ...creature,
          zone: "board",
          position: coordinate,
          boardEntrySequence: state.eventCursor + 1,
          movement: 2,
          summonedThisTurn: false,
          movedThisTurn: false
        }
      }
    };

    const occupant = projectPublicBattleView(withOccupant).boardSquares.find(
      (square) => square.key === "5:8"
    )?.occupant;

    expect(occupant).toMatchObject({
      instanceId: creature.instanceId,
      catalogCardId: creature.catalogCardId,
      controllerSide: "player",
      summonedThisTurn: false,
      isActionable: true
    });
    expect(occupant).not.toHaveProperty("zone");
    expect(occupant).not.toHaveProperty("effectIds");
    expect(occupant).not.toHaveProperty("position");
  });

  it("uses deterministic unavailable views for dangling hand and board references", () => {
    const state = sampleBattleState();
    const missingHandId = state.players.player.handZone[0] as string;
    const cardInstances = { ...state.cardInstances };
    delete cardInstances[missingHandId];
    const withMissingReferences: BattleState = {
      ...state,
      board: {
        squares: state.board.squares.map((square) =>
          square.coordinate.column === 5 && square.coordinate.row === 8
            ? { ...square, occupantId: "missing-board-card" }
            : square
        )
      },
      cardInstances
    };

    const view = projectPublicBattleView(withMissingReferences);
    const handFallback = view.playerHand[0];
    const boardFallback = view.boardSquares.find(
      (square) => square.key === "5:8"
    )?.occupant;

    expect(handFallback).toMatchObject({
      instanceId: missingHandId,
      name: "Unknown card",
      presentationStatus: "unavailable",
      isActionable: false
    });
    expect(boardFallback).toMatchObject({
      instanceId: "missing-board-card",
      catalogCardId: "unknown-missing-board-card",
      presentationStatus: "unavailable",
      isInspectable: true
    });
  });

  it("does not expose an opponent creature name through AK-019 effect choices", () => {
    const state = sampleBattleState();
    const handId = state.players.player.handZone[0]!;
    const cpuId = Object.values(state.cardInstances).find((card) => card.ownerSide === "cpu" && card.type !== "spell")!.instanceId;
    const coordinate = { column: 5, row: 8 };
    const secured: BattleState = {
      ...state, phase: "play", activeSide: "player", terminalResult: undefined,
      players: { ...state.players, player: { ...state.players.player, currentPp: 10 } },
      board: { squares: state.board.squares.map((square) => square.coordinate.column === coordinate.column && square.coordinate.row === coordinate.row ? { ...square, occupantId: cpuId } : square) },
      cardInstances: { ...state.cardInstances,
        [handId]: { ...state.cardInstances[handId]!, type: "spell", catalogCardId: "AK-019", effectIds: ["AK-019.primary"], currentCost: 1 },
        [cpuId]: { ...state.cardInstances[cpuId]!, name: "SENTINEL_SECRET", zone: "board", position: coordinate, controllerSide: "cpu" }
      }
    };
    const choice = getPublicEffectChoices(secured, "player").find((candidate) => candidate.sourceInstanceId === handId)!;
    expect(choice.candidates.map((candidate) => candidate.label).join(" ")).not.toContain("SENTINEL_SECRET");
  });
});

function sampleBattleState(): BattleState {
  return fc.sample(battleStateArbitrary, { numRuns: 1, seed: 2002 })[0];
}
