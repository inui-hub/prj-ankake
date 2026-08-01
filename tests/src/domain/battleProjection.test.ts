import {
  projectPublicBattleView,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("public battle projection", () => {
  it("projects player hand order and PP without CPU hand identities or legal actions", () => {
    const state = sampleBattleState();
    const view = projectPublicBattleView(state);
    const serialized = JSON.stringify(view);

    expect(view.playerCurrentPp).toBe(state.players.player.currentPp);
    expect(view.playerMaxPp).toBe(state.players.player.maxPp);
    expect(view.playerHand.map((card) => card.instanceId)).toEqual(
      state.players.player.handZone
    );
    expect(view.cpuHandCount).toBe(state.players.cpu.handZone.length);
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
          summonedThisTurn: true
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
      summonedThisTurn: true
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
});

function sampleBattleState(): BattleState {
  return fc.sample(battleStateArbitrary, { numRuns: 1, seed: 2002 })[0];
}
