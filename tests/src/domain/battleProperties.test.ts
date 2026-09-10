import {
  BATTLE_BASE_IDS,
  CANONICAL_BOARD_COORDINATES,
  GameEngine,
  INITIAL_SUMMON_COORDINATES_BY_SIDE,
  RESONANCE_MAX,
  coordinateKey,
  evaluateMovementDraft,
  generateLegalActions,
  getAdjacentBoardCoordinates,
  getBattleBaseAt,
  getSummonDestinations,
  getSummonRangeCoordinates,
  getLane,
  getOwnedNeutralBases,
  getOccupantId,
  getShortestMovementPaths,
  getTerrain,
  isExistingBoardCoordinate,
  isInitialSummonCoordinate,
  isNormalBoardCoordinate,
  isWithinBasicAttackRange,
  listAttackersInBoardOrder,
  projectPublicBattleView,
  queryMovementStart,
  querySummonStart,
  resolveAttackPhase,
  resolveCreatureAttack,
  sameCoordinate,
  snapshotAttackTargets,
  updateBattleBase,
  validateBattleCommand
} from "@ankake/domain";
import fc from "fast-check";
import {
  absentBoardCoordinateArbitrary,
  attackResolutionStateArbitrary,
  baseBoardCoordinateArbitrary,
  battleStateArbitrary,
  battleStateWithBaseStateArbitrary,
  battleStateWithBoardEntriesArbitrary,
  canonicalBoardCoordinateArbitrary,
  initialSummonCoordinateArbitrary,
  invalidMovementSuffixArbitrary,
  invalidSummonCommandArbitrary,
  lethalCreatureAttackStateArbitrary,
  legalBattleCommandArbitrary,
  movableCreatureStateArbitrary,
  neutralCaptureStateArbitrary,
  neutralVictoryStateArbitrary,
  nonterminalAttackStateArbitrary,
  normalBoardCoordinateArbitrary,
  occupiedInitialSummonStateArbitrary,
  originReturnMovementArbitrary,
  reachableMovementEndpointArbitrary,
  staleAttackTargetStateArbitrary,
  validBattleBaseStateMapArbitrary,
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

  it("keeps every generated base map complete, unique, and inside domain ranges", () => {
    fc.assert(
      fc.property(validBattleBaseStateMapArbitrary, (bases) => {
        const values = BATTLE_BASE_IDS.map((id) => bases[id]);
        const coordinateKeys = values.map((base) => coordinateKey(base.coordinate));

        expect(values.map((base) => base.id)).toEqual(BATTLE_BASE_IDS);
        expect(new Set(coordinateKeys).size).toBe(BATTLE_BASE_IDS.length);
        expect(bases["player-base"].owner).toBe("player");
        expect(bases["cpu-base"].owner).toBe("cpu");
        for (const base of values) {
          expect(Number.isInteger(base.currentHp)).toBe(true);
          expect(Number.isInteger(base.maxHp)).toBe(true);
          expect(base.currentHp).toBeGreaterThanOrEqual(0);
          expect(base.currentHp).toBeLessThanOrEqual(base.maxHp);
          expect(base.maxHp).toBeGreaterThan(0);
          expect(getBattleBaseAt(bases, base.coordinate)).toBe(base);
        }
      }),
      { numRuns: 80, seed: 8101 }
    );
  });

  it("keeps owned neutral base queries canonical, pure, and side-specific", () => {
    fc.assert(
      fc.property(validBattleBaseStateMapArbitrary, (bases) => {
        const before = JSON.stringify(bases);

        for (const side of ["player", "cpu"] as const) {
          const owned = getOwnedNeutralBases(bases, side);
          expect(owned.map((base) => base.id)).toEqual(
            BATTLE_BASE_IDS.filter(
              (id) => bases[id].kind === "neutral-base" && bases[id].owner === side
            )
          );
          expect(owned.every((base) => base.kind === "neutral-base")).toBe(true);
          expect(owned.every((base) => base.owner === side)).toBe(true);
        }

        expect(JSON.stringify(bases)).toBe(before);
      }),
      { numRuns: 80, seed: 8102 }
    );
  });

  it("projects generated base states in canonical order without changing input", () => {
    fc.assert(
      fc.property(battleStateWithBaseStateArbitrary, (state) => {
        const before = JSON.stringify(state);
        const first = projectPublicBattleView(state);
        const second = projectPublicBattleView(state);

        expect(first).toEqual(second);
        expect(first.bases.map((base) => base.id)).toEqual(BATTLE_BASE_IDS);
        for (const base of first.bases) {
          expect(base).toMatchObject(state.bases[base.id]);
        }
        expect(first.boardSquares.filter((square) => square.base)).toHaveLength(5);
        expect(JSON.stringify(state)).toBe(before);
      }),
      { numRuns: 60, seed: 8103 }
    );
  });

  it("keeps board entry sequences present, positive, and unique only on board cards", () => {
    fc.assert(
      fc.property(battleStateWithBoardEntriesArbitrary, (state) => {
        const boardCards = Object.values(state.cardInstances).filter(
          (card) => card.zone === "board"
        );
        const boardSequences = boardCards.map((card) => card.boardEntrySequence);

        expect(
          boardSequences.every(
            (sequence) => Number.isInteger(sequence) && (sequence ?? 0) > 0
          )
        ).toBe(true);
        expect(new Set(boardSequences).size).toBe(boardSequences.length);
        expect(
          Object.values(state.cardInstances)
            .filter((card) => card.zone !== "board")
            .every((card) => card.boardEntrySequence === undefined)
        ).toBe(true);
      }),
      { numRuns: 60, seed: 8104 }
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

  it("keeps summon candidates unique, ordered, and inside the side-specific legal range", () => {
    fc.assert(
      fc.property(occupiedInitialSummonStateArbitrary, (fixture) => {
        const result = querySummonStart(
          fixture.state,
          fixture.side,
          fixture.handInstanceId
        );
        const occupiedKeys = new Set(fixture.occupiedCoordinates.map(coordinateKey));
        const expected = getSummonRangeCoordinates(fixture.state, fixture.side)
          .filter((coordinate) => !occupiedKeys.has(coordinateKey(coordinate)))
          .map(coordinateKey);
        const actual = result.candidateDestinations.map(coordinateKey);

        expect(actual).toEqual(expected);
        expect(new Set(actual).size).toBe(actual.length);
        expect(
          result.candidateDestinations.every((coordinate) =>
            getSummonRangeCoordinates(fixture.state, fixture.side)
              .map(coordinateKey)
              .includes(coordinateKey(coordinate))
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

  it("uses the exact initial-plus-owned-base range with immediate ownership changes", () => {
    fc.assert(
      fc.property(battleStateWithBaseStateArbitrary, (state) => {
        for (const side of ["player", "cpu"] as const) {
          const expected = [
            ...INITIAL_SUMMON_COORDINATES_BY_SIDE[side],
            ...getOwnedNeutralBases(state.bases, side).flatMap((base) =>
              getAdjacentBoardCoordinates(base.coordinate).filter(isNormalBoardCoordinate)
            )
          ].filter(
            (coordinate, index, coordinates) =>
              coordinates.findIndex(
                (candidate) => coordinateKey(candidate) === coordinateKey(coordinate)
              ) === index
          );

          expect(getSummonRangeCoordinates(state, side).map(coordinateKey)).toEqual(
            expected.map(coordinateKey)
          );
        }

        const gained = {
          ...state,
          bases: updateBattleBase(state.bases, "neutral-center", (base) => ({
            ...base,
            owner: "player"
          }))
        };
        const lost = {
          ...gained,
          bases: updateBattleBase(gained.bases, "neutral-center", (base) => ({
            ...base,
            owner: "cpu"
          }))
        };
        const centerNeighbors = getAdjacentBoardCoordinates(
          state.bases["neutral-center"].coordinate
        )
          .filter(isNormalBoardCoordinate)
          .map(coordinateKey);

        expect(getSummonRangeCoordinates(gained, "player").map(coordinateKey)).toEqual(
          expect.arrayContaining(centerNeighbors)
        );
        expect(getSummonRangeCoordinates(lost, "player").map(coordinateKey)).not.toEqual(
          expect.arrayContaining(centerNeighbors)
        );
      }),
      { numRuns: 80, seed: 8302 }
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

  it("keeps every generated CPU summon action inside the shared CPU range and valid", () => {
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

            expect(getSummonRangeCoordinates(fixture.state, "cpu")).toContainEqual(
              action.command.destination
            );
            expect(validateBattleCommand(fixture.state, action.command)).toEqual([]);
          }
        }
      ),
      { numRuns: 60 }
    );
  });

  it("keeps player destinations and CPU summon actions equivalent for the same state", () => {
    fc.assert(
      fc.property(
        occupiedInitialSummonStateArbitrary.filter((fixture) => fixture.side === "cpu"),
        (fixture) => {
          const destinations = getSummonDestinations(
            fixture.state,
            "cpu",
            fixture.handInstanceId
          ).map(coordinateKey);
          const actionDestinations: string[] = [];
          for (const action of generateLegalActions(fixture.state, "cpu")) {
            if (
              action.command.type === "summonCreature" &&
              action.command.handInstanceId === fixture.handInstanceId
            ) {
              actionDestinations.push(coordinateKey(action.command.destination));
            }
          }

          // A destination still has to be in the shared summon range, but a
          // creature with a mandatory summon target has no legal command
          // until a target can also be selected.
          expect(actionDestinations.every((destination) => destinations.includes(destination))).toBe(true);
          expect(new Set(actionDestinations).size).toBe(actionDestinations.length);
        }
      ),
      { numRuns: 60, seed: 8301 }
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

  it("keeps the generated attacker set and board-entry ordering exact", () => {
    fc.assert(
      fc.property(attackResolutionStateArbitrary, (fixture) => {
        const actual = listAttackersInBoardOrder(fixture.state, fixture.side);
        const expected = Object.values(fixture.state.cardInstances)
          .filter(
            (card) =>
              card.zone === "board" &&
              card.type !== "spell" &&
              card.controllerSide === fixture.side
          )
          .sort(
            (left, right) =>
              (left.boardEntrySequence ?? Number.MAX_SAFE_INTEGER) -
                (right.boardEntrySequence ?? Number.MAX_SAFE_INTEGER) ||
              left.instanceId.localeCompare(right.instanceId, "en")
          )
          .map((card) => card.instanceId);

        expect(actual).toEqual(expected);
        expect(new Set(actual)).toEqual(new Set(fixture.attackerIds));
      }),
      { numRuns: 80, seed: 8201 }
    );
  });

  it("matches target snapshots to the adjacency oracle with creature-first ordering", () => {
    fc.assert(
      fc.property(attackResolutionStateArbitrary, (fixture) => {
        const attacker = fixture.state.cardInstances[fixture.attackerId]!;
        const snapshot = snapshotAttackTargets(fixture.state, fixture.attackerId);
        const kinds = snapshot.targets.map((target) => target.kind);
        const firstBaseIndex = kinds.indexOf("base");

        expect(new Set(snapshot.targets.map((target) => JSON.stringify(target))).size).toBe(
          snapshot.targets.length
        );
        if (firstBaseIndex >= 0) {
          expect(kinds.slice(0, firstBaseIndex).every((kind) => kind === "creature")).toBe(true);
          expect(kinds.slice(firstBaseIndex).every((kind) => kind === "base")).toBe(true);
        }
        for (const target of snapshot.targets) {
          const coordinate =
            target.kind === "creature"
              ? fixture.state.cardInstances[target.instanceId]?.position
              : fixture.state.bases[target.baseId].coordinate;
          expect(coordinate).toBeDefined();
          expect(isWithinBasicAttackRange(attacker.position!, coordinate!)).toBe(true);
        }
      }),
      { numRuns: 80, seed: 8202 }
    );
  });

  it("resolves nonterminal attacks deterministically with contiguous events and no input mutation", () => {
    fc.assert(
      fc.property(nonterminalAttackStateArbitrary, (fixture) => {
        const before = JSON.stringify(fixture.state);
        const first = resolveAttackPhase(fixture.state, fixture.side, 1000);
        const second = resolveAttackPhase(fixture.state, fixture.side, 1000);

        expect(first).toEqual(second);
        expect(JSON.stringify(fixture.state)).toBe(before);
        expect(first.events.map((event) => event.sequence)).toEqual(
          first.events.map((_, index) => 1000 + index)
        );
        expect(first.state.eventCursor).toBe(first.events.at(-1)?.sequence);
      }),
      { numRuns: 60, seed: 8203 }
    );
  });

  it("keeps lethal damage consistent across card, board, and graveyard aggregates", () => {
    fc.assert(
      fc.property(lethalCreatureAttackStateArbitrary, (fixture) => {
        const targetId = fixture.enemyIds[0];
        const result = resolveAttackPhase(fixture.state, fixture.side, 1100);
        const target = result.state.cardInstances[targetId]!;

        expect(target.zone).toBe("graveyard");
        expect(target.currentHp).toBe(0);
        expect(target.position).toBeUndefined();
        expect(target.boardEntrySequence).toBeUndefined();
        expect(
          result.state.board.squares.some((square) => square.occupantId === targetId)
        ).toBe(false);
        expect(result.state.players.cpu.graveyardZone.filter((id) => id === targetId)).toHaveLength(1);
      }),
      { numRuns: 60, seed: 8204 }
    );
  });

  it("preserves base identity and resets HP after generated capture or recapture", () => {
    fc.assert(
      fc.property(neutralCaptureStateArbitrary, (fixture) => {
        const before = fixture.state.bases["neutral-center"];
        const result = resolveAttackPhase(fixture.state, fixture.side, 1200);
        const captured = result.state.bases["neutral-center"];

        expect(captured).toMatchObject({
          id: before.id,
          coordinate: before.coordinate,
          kind: before.kind,
          maxHp: before.maxHp,
          owner: fixture.side,
          currentHp: before.maxHp
        });
      }),
      { numRuns: 60, seed: 8205 }
    );
  });

  it("produces a stable neutral-control terminal and stops subsequent resolution", () => {
    fc.assert(
      fc.property(neutralVictoryStateArbitrary, (fixture) => {
        const result = resolveAttackPhase(fixture.state, fixture.side, 1300);

        expect(result.state.terminalResult).toMatchObject({
          winner: fixture.side,
          reason: "neutral-bases-controlled"
        });
        expect(result.state.terminalResult?.finalEventSequence).toBe(
          result.events.at(-1)?.sequence
        );
        const repeated = resolveAttackPhase(
          result.state,
          fixture.side,
          result.state.eventCursor + 1
        );
        expect(repeated.state).toBe(result.state);
        expect(repeated.events).toEqual([]);
      }),
      { numRuns: 60, seed: 8206 }
    );
  });

  it("emits a reproducible skip for generated stale targets", () => {
    fc.assert(
      fc.property(staleAttackTargetStateArbitrary, (fixture) => {
        const result = resolveCreatureAttack(fixture.state, fixture.snapshot, 1400);
        const skipped = result.events.find(
          (event) =>
            event.type === "attack.target-skipped" &&
            event.data?.targetId === fixture.staleTargetId
        );

        expect(skipped?.data?.reason).toBe("target-left-board");
      }),
      { numRuns: 60, seed: 8207 }
    );
  });
});
