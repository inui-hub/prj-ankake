import {
  CANONICAL_BOARD_COORDINATES,
  GameEngine,
  INITIAL_SUMMON_COORDINATES_BY_SIDE,
  RESONANCE_MAX,
  coordinateKey,
  evaluateMovementDraft,
  generateLegalActions,
  getAdjacentBoardCoordinates,
  getLane,
  getOccupantId,
  getShortestMovementPaths,
  getTerrain,
  isExistingBoardCoordinate,
  isInitialSummonCoordinate,
  isNormalBoardCoordinate,
  projectPublicBattleView,
  queryMovementStart,
  querySummonStart,
  sameCoordinate,
  validateBattleCommand
} from "@ankake/domain";
import fc from "fast-check";
import {
  absentBoardCoordinateArbitrary,
  baseBoardCoordinateArbitrary,
  battleStateArbitrary,
  canonicalBoardCoordinateArbitrary,
  initialSummonCoordinateArbitrary,
  invalidMovementSuffixArbitrary,
  invalidSummonCommandArbitrary,
  legalBattleCommandArbitrary,
  movableCreatureStateArbitrary,
  normalBoardCoordinateArbitrary,
  occupiedInitialSummonStateArbitrary,
  originReturnMovementArbitrary,
  reachableMovementEndpointArbitrary,
  validMovementPathArbitrary
} from "../generators/battleGenerators";

describe("battle domain properties", () => {
  it("accepts every generated legal action for the same state", () => {
    fc.assert(
      fc.property(legalBattleCommandArbitrary, ({ state, command }) => {
        const result = GameEngine.submitCommand(state, command);
        expect(result.ok).toBe(true);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps board occupancy unique after accepted generated commands", () => {
    fc.assert(
      fc.property(legalBattleCommandArbitrary, ({ state, command }) => {
        const result = GameEngine.submitCommand(state, command);
        if (!result.ok) {
          return;
        }

        const occupants = result.state.board.squares
          .map((square) => square.occupantId)
          .filter((id): id is string => Boolean(id));
        expect(new Set(occupants).size).toBe(occupants.length);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps resource, hand, and resonance values in range", () => {
    fc.assert(
      fc.property(legalBattleCommandArbitrary, ({ state, command }) => {
        const result = GameEngine.submitCommand(state, command);
        if (!result.ok) {
          return;
        }

        for (const player of Object.values(result.state.players)) {
          expect(player.currentPp).toBeGreaterThanOrEqual(0);
          expect(player.currentPp).toBeLessThanOrEqual(player.maxPp);
          expect(player.handZone.length).toBeLessThanOrEqual(9);

          for (const lane of Object.values(player.resonance)) {
            for (const value of Object.values(lane)) {
              expect(value).toBeGreaterThanOrEqual(0);
              expect(value).toBeLessThanOrEqual(RESONANCE_MAX);
            }
          }
        }
      }),
      { numRuns: 40 }
    );
  });

  it("does not produce legal actions when the battle is not active for that side", () => {
    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        const inactiveSide = state.activeSide === "player" ? "cpu" : "player";
        expect(generateLegalActions(state, inactiveSide)).toEqual([]);
      }),
      { numRuns: 30 }
    );
  });

  it("keeps every generated board equal to the canonical 75-square set", () => {
    const canonicalKeys = CANONICAL_BOARD_COORDINATES.map(coordinateKey);

    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        const keys = state.board.squares.map((square) =>
          coordinateKey(square.coordinate)
        );

        expect(keys).toEqual(canonicalKeys);
        expect(new Set(keys).size).toBe(75);
        expect(state.board.squares.filter((square) => square.terrain === "normal")).toHaveLength(70);
        expect(state.board.squares.filter((square) => square.terrain !== "normal")).toHaveLength(5);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps canonical, normal, base, and absent generators inside their domains", () => {
    fc.assert(
      fc.property(
        canonicalBoardCoordinateArbitrary,
        normalBoardCoordinateArbitrary,
        baseBoardCoordinateArbitrary,
        absentBoardCoordinateArbitrary,
        (canonical, normal, base, absent) => {
          expect(isExistingBoardCoordinate(canonical)).toBe(true);
          expect(isNormalBoardCoordinate(normal)).toBe(true);
          expect(getTerrain(base)).not.toBe("normal");
          expect(isExistingBoardCoordinate(absent)).toBe(false);
          expect(getTerrain(absent)).toBeUndefined();
        }
      ),
      { numRuns: 60 }
    );
  });

  it("keeps the canonical lane partition at 24, 27, and 24 squares", () => {
    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        const counts = { left: 0, center: 0, right: 0 };

        for (const square of state.board.squares) {
          expect(square.lane).toBe(getLane(square.coordinate.column));
          counts[square.lane] += 1;
        }

        expect(counts).toEqual({ left: 24, center: 27, right: 24 });
      }),
      { numRuns: 30 }
    );
  });

  it("generates only canonical normal board destinations", () => {
    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        const actions = generateLegalActions(state, state.activeSide);

        for (const action of actions) {
          if (action.command.type === "summonCreature") {
            expect(isNormalBoardCoordinate(action.command.destination)).toBe(true);
          }

          if (action.command.type === "moveCreature") {
            for (const step of action.command.path) {
              expect(isNormalBoardCoordinate(step)).toBe(true);
            }
          }
        }
      }),
      { numRuns: 40 }
    );
  });

  it("preserves player hand order in every public projection", () => {
    fc.assert(
      fc.property(battleStateArbitrary, (state) => {
        expect(
          projectPublicBattleView(state).playerHand.map((card) => card.instanceId)
        ).toEqual(state.players.player.handZone);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps summon candidates unique, ordered, and inside the side-specific initial set", () => {
    fc.assert(
      fc.property(occupiedInitialSummonStateArbitrary, (fixture) => {
        const result = querySummonStart(
          fixture.state,
          fixture.side,
          fixture.handInstanceId
        );
        const occupiedKeys = new Set(fixture.occupiedCoordinates.map(coordinateKey));
        const expected = INITIAL_SUMMON_COORDINATES_BY_SIDE[fixture.side]
          .filter((coordinate) => !occupiedKeys.has(coordinateKey(coordinate)))
          .map(coordinateKey);
        const actual = result.candidateDestinations.map(coordinateKey);

        expect(actual).toEqual(expected);
        expect(new Set(actual).size).toBe(actual.length);
        expect(
          result.candidateDestinations.every((coordinate) =>
            isInitialSummonCoordinate(fixture.side, coordinate)
          )
        ).toBe(true);
        expect(result.eligible).toBe(expected.length > 0);
      }),
      { numRuns: 80 }
    );
  });

  it("keeps summon queries pure and repeatable", () => {
    fc.assert(
      fc.property(occupiedInitialSummonStateArbitrary, (fixture) => {
        const before = JSON.stringify(fixture.state);
        const first = querySummonStart(
          fixture.state,
          fixture.side,
          fixture.handInstanceId
        );
        const second = querySummonStart(
          fixture.state,
          fixture.side,
          fixture.handInstanceId
        );

        expect(first).toEqual(second);
        expect(JSON.stringify(fixture.state)).toBe(before);
      }),
      { numRuns: 60 }
    );
  });

  it("rejects generated invalid summon destinations without replacing state", () => {
    fc.assert(
      fc.property(invalidSummonCommandArbitrary, ({ state, command }) => {
        const result = GameEngine.submitCommand(state, command);

        expect(validateBattleCommand(state, command).length).toBeGreaterThan(0);
        expect(result.ok).toBe(false);
        expect(result.state).toBe(state);
      }),
      { numRuns: 80 }
    );
  });

  it("generates valid side-tagged initial summon coordinates", () => {
    fc.assert(
      fc.property(initialSummonCoordinateArbitrary, ({ side, coordinate }) => {
        expect(isInitialSummonCoordinate(side, coordinate)).toBe(true);
        expect(isNormalBoardCoordinate(coordinate)).toBe(true);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps every generated CPU summon action inside the exact CPU range and valid", () => {
    fc.assert(
      fc.property(
        occupiedInitialSummonStateArbitrary.filter((fixture) => fixture.side === "cpu"),
        (fixture) => {
          const summons = generateLegalActions(fixture.state, "cpu").filter(
            (action) => action.command.type === "summonCreature"
          );

          for (const action of summons) {
            if (action.command.type !== "summonCreature") {
              continue;
            }

            expect(isInitialSummonCoordinate("cpu", action.command.destination)).toBe(true);
            expect(validateBattleCommand(fixture.state, action.command)).toEqual([]);
          }
        }
      ),
      { numRuns: 60 }
    );
  });

  it("keeps movement candidates canonical, unique, legal, and query-pure", () => {
    fc.assert(
      fc.property(movableCreatureStateArbitrary, (fixture) => {
        const before = JSON.stringify(fixture.state);
        const first = queryMovementStart(
          fixture.state,
          fixture.side,
          fixture.creatureInstanceId
        );
        const second = queryMovementStart(
          fixture.state,
          fixture.side,
          fixture.creatureInstanceId
        );
        const expected = getAdjacentBoardCoordinates(fixture.origin)
          .filter(isNormalBoardCoordinate)
          .filter((coordinate) => {
            const occupantId = getOccupantId(fixture.state.board, coordinate);
            return (
              !occupantId ||
              (occupantId === fixture.creatureInstanceId &&
                sameCoordinate(coordinate, fixture.origin))
            );
          })
          .map(coordinateKey);
        const actual = first.candidateNextSteps.map(coordinateKey);

        expect(first).toEqual(second);
        expect(JSON.stringify(fixture.state)).toBe(before);
        expect(actual).toEqual(expected);
        expect(new Set(actual).size).toBe(actual.length);
        expect(first.eligible).toBe(expected.length > 0);
      }),
      { numRuns: 80, seed: 7306 }
    );
  });

  it("keeps generated reachable movement endpoints unique, deterministic, and valid", () => {
    fc.assert(
      fc.property(movableCreatureStateArbitrary, (fixture) => {
        const first = getShortestMovementPaths(
          fixture.state,
          fixture.side,
          fixture.creatureInstanceId
        );
        const second = getShortestMovementPaths(
          fixture.state,
          fixture.side,
          fixture.creatureInstanceId
        );
        const endpoints = first.map((path) => coordinateKey(path[path.length - 1]!));

        expect(first).toEqual(second);
        expect(new Set(endpoints).size).toBe(endpoints.length);
        expect(endpoints).not.toContain(coordinateKey(fixture.origin));
        for (const path of first) {
          expect(path.length).toBeGreaterThan(0);
          expect(path.length).toBeLessThanOrEqual(fixture.maximumMovement);
          expect(
            validateBattleCommand(fixture.state, {
              type: "moveCreature",
              side: fixture.side,
              creatureInstanceId: fixture.creatureInstanceId,
              origin: fixture.origin,
              path
            })
          ).toEqual([]);
        }
      }),
      { numRuns: 60, seed: 7307 }
    );
  });

  it("accepts generated valid movement paths and preserves board identity invariants", () => {
    fc.assert(
      fc.property(validMovementPathArbitrary, (fixture) => {
        const result = GameEngine.submitCommand(fixture.state, {
          type: "moveCreature",
          side: fixture.side,
          creatureInstanceId: fixture.creatureInstanceId,
          origin: fixture.origin,
          path: fixture.path
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          const endpoint = fixture.path[fixture.path.length - 1]!;
          const occupants = result.state.board.squares.filter(
            (square) => square.occupantId === fixture.creatureInstanceId
          );
          expect(occupants).toHaveLength(1);
          expect(occupants[0]?.coordinate).toEqual(endpoint);
          expect(result.state.cardInstances[fixture.creatureInstanceId]).toMatchObject({
            position: endpoint,
            movedThisTurn: true
          });
        }
      }),
      { numRuns: 80, seed: 7308 }
    );
  });

  it("retains the longest valid prefix and rejects invalid suffixes by identity", () => {
    fc.assert(
      fc.property(invalidMovementSuffixArbitrary, (fixture) => {
        const proposedPath = [...fixture.path, fixture.invalidStep];
        const evaluation = evaluateMovementDraft(
          fixture.state,
          fixture.side,
          fixture.creatureInstanceId,
          fixture.origin,
          proposedPath
        );
        const result = GameEngine.submitCommand(fixture.state, {
          type: "moveCreature",
          side: fixture.side,
          creatureInstanceId: fixture.creatureInstanceId,
          origin: fixture.origin,
          path: proposedPath
        });

        expect(evaluation.validPath).toEqual(fixture.path);
        expect(evaluation.issues.length).toBeGreaterThan(0);
        expect(result.ok).toBe(false);
        expect(result.state).toBe(fixture.state);
      }),
      { numRuns: 80, seed: 7309 }
    );
  });

  it("accepts generated origin-return paths and reachable endpoint fixtures", () => {
    fc.assert(
      fc.property(
        originReturnMovementArbitrary,
        reachableMovementEndpointArbitrary,
        (returning, reachable) => {
          const result = GameEngine.submitCommand(returning.state, {
            type: "moveCreature",
            side: returning.side,
            creatureInstanceId: returning.creatureInstanceId,
            origin: returning.origin,
            path: returning.path
          });

          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.state.cardInstances[returning.creatureInstanceId]?.position).toEqual(
              returning.origin
            );
          }
          expect(reachable.endpoint).toEqual(
            reachable.path[reachable.path.length - 1]
          );
        }
      ),
      { numRuns: 60, seed: 7310 }
    );
  });
});
