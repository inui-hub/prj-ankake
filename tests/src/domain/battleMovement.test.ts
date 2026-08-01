import {
  GameEngine,
  coordinateKey,
  evaluateMovementDraft,
  getShortestMovementPaths,
  placeCreatureForTest,
  queryMovementStart,
  setBoardOccupant,
  validateBattleCommand,
  type BattleState,
  type BoardCoordinate
} from "@ankake/domain";
import fc from "fast-check";
import { eligibleHandCreatureStateArbitrary } from "../generators/battleGenerators";

describe("creature movement", () => {
  it("offers all eight canonical adjacent normal squares from an open center", () => {
    const { state, creatureId } = createMovementState({ column: 4, row: 5 });

    const start = queryMovementStart(state, "player", creatureId);

    expect(start.eligible).toBe(true);
    if (start.eligible) {
      expect(start.candidateNextSteps.map(coordinateKey)).toEqual([
        "3:4",
        "4:4",
        "5:4",
        "3:5",
        "5:5",
        "3:6",
        "4:6",
        "5:6"
      ]);
    }
  });

  it("allows diagonal corner passage but excludes absent, base, and occupied squares", () => {
    const corner = createMovementState({ column: 3, row: 1 });
    const cornerStart = queryMovementStart(corner.state, "player", corner.creatureId);
    expect(cornerStart.eligible && cornerStart.candidateNextSteps.map(coordinateKey)).toContain(
      "2:2"
    );

    const constrained = createMovementState({ column: 5, row: 4 });
    const occupiedState = {
      ...constrained.state,
      board: setBoardOccupant(
        constrained.state.board,
        { column: 4, row: 4 },
        "blocker"
      )
    };
    const constrainedStart = queryMovementStart(
      occupiedState,
      "player",
      constrained.creatureId
    );
    const keys = constrainedStart.eligible
      ? constrainedStart.candidateNextSteps.map(coordinateKey)
      : [];

    expect(keys).not.toContain("4:3");
    expect(keys).not.toContain("6:5");
    expect(keys).not.toContain("4:4");
  });

  it("returns no-destination when every adjacent square is occupied", () => {
    const fixture = createMovementState({ column: 4, row: 5 });
    const adjacent = [
      { column: 3, row: 4 },
      { column: 4, row: 4 },
      { column: 5, row: 4 },
      { column: 3, row: 5 },
      { column: 5, row: 5 },
      { column: 3, row: 6 },
      { column: 4, row: 6 },
      { column: 5, row: 6 }
    ];
    const blocked = adjacent.reduce(
      (state, coordinate, index) => ({
        ...state,
        board: setBoardOccupant(state.board, coordinate, `blocker-${index}`)
      }),
      fixture.state
    );

    const start = queryMovementStart(blocked, "player", fixture.creatureId);

    expect(start.eligible).toBe(false);
    expect(start.issues[0]?.code).toBe("battle.move.no-destination");
  });

  it("reports source eligibility failures before path failures", () => {
    const fixture = createMovementState({ column: 4, row: 5 });
    const summoned: BattleState = {
      ...fixture.state,
      cardInstances: {
        ...fixture.state.cardInstances,
        [fixture.creatureId]: {
          ...fixture.state.cardInstances[fixture.creatureId]!,
          summonedThisTurn: true
        }
      }
    };

    expect(queryMovementStart(summoned, "player", fixture.creatureId).issues[0]?.code).toBe(
      "battle.move.already-moved"
    );
    expect(
      validateBattleCommand(summoned, {
        type: "moveCreature",
        side: "player",
        creatureInstanceId: fixture.creatureId,
        origin: fixture.origin,
        path: []
      })[0]?.code
    ).toBe("battle.move.already-moved");
  });

  it("keeps the longest valid prefix and permits revisits including origin return", () => {
    const fixture = createMovementState({ column: 4, row: 5 }, 3);
    const returning = evaluateMovementDraft(
      fixture.state,
      "player",
      fixture.creatureId,
      fixture.origin,
      [
        { column: 5, row: 5 },
        fixture.origin,
        { column: 5, row: 5 }
      ]
    );
    const invalidSuffix = evaluateMovementDraft(
      fixture.state,
      "player",
      fixture.creatureId,
      fixture.origin,
      [
        { column: 5, row: 5 },
        { column: 6, row: 5 }
      ]
    );

    expect(returning.issues).toEqual([]);
    expect(returning.validPath.map(coordinateKey)).toEqual(["5:5", "4:5", "5:5"]);
    expect(invalidSuffix.validPath.map(coordinateKey)).toEqual(["5:5"]);
    expect(invalidSuffix.issues[0]?.code).toBe("battle.board.destination-invalid");
  });

  it("limits a movement-one creature to a single path step", () => {
    const fixture = createMovementState({ column: 4, row: 5 }, 1);
    const path = [
      { column: 5, row: 5 },
      { column: 5, row: 4 }
    ];

    const evaluation = evaluateMovementDraft(
      fixture.state,
      "player",
      fixture.creatureId,
      fixture.origin,
      path
    );
    const issues = validateBattleCommand(fixture.state, {
      type: "moveCreature",
      side: "player",
      creatureInstanceId: fixture.creatureId,
      origin: fixture.origin,
      path
    });

    expect(evaluation.validPath.map(coordinateKey)).toEqual(["5:5"]);
    expect(evaluation.candidateNextSteps).toEqual([]);
    expect(evaluation.issues[0]?.code).toBe("battle.move.too-far");
    expect(issues[0]?.code).toBe("battle.move.too-far");
  });

  it("enumerates one deterministic shortest path per reachable non-origin endpoint", () => {
    const fixture = createMovementState({ column: 4, row: 5 }, 2);

    const paths = getShortestMovementPaths(fixture.state, "player", fixture.creatureId);
    const endpointKeys = paths.map((path) => coordinateKey(path[path.length - 1]!));

    expect(endpointKeys).toEqual([...new Set(endpointKeys)]);
    expect(paths.every((path) => path.length >= 1 && path.length <= 2)).toBe(true);
    expect(endpointKeys).not.toContain(coordinateKey(fixture.origin));
    expect(getShortestMovementPaths(fixture.state, "player", fixture.creatureId)).toEqual(
      paths
    );
  });
});

function createMovementState(
  origin: BoardCoordinate,
  movement = 3
): {
  readonly state: BattleState;
  readonly creatureId: string;
  readonly origin: BoardCoordinate;
} {
  const fixture = fc.sample(eligibleHandCreatureStateArbitrary, {
    numRuns: 1,
    seed: 7303
  })[0]!;
  const placed = placeCreatureForTest(
    fixture.state,
    fixture.handInstanceId,
    "player",
    origin.column,
    origin.row
  );

  return {
    creatureId: fixture.handInstanceId,
    origin,
    state: {
      ...placed,
      phase: "play",
      activeSide: "player",
      terminalResult: undefined,
      cardInstances: {
        ...placed.cardInstances,
        [fixture.handInstanceId]: {
          ...placed.cardInstances[fixture.handInstanceId]!,
          type: "creature",
          movement,
          summonedThisTurn: false,
          movedThisTurn: false
        }
      }
    }
  };
}
