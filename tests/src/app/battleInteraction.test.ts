import {
  createInitialBattleBoard,
  setBoardOccupant,
  type BattleCardInstance,
  type BattleState
} from "@ankake/domain";
import fc from "fast-check";
import {
  IDLE_BATTLE_INTERACTION,
  cancelBattleInteraction,
  guardEndPlayPhase,
  prepareSummonConfirmation,
  projectBattleInteractionFromState,
  recoverSummonInteraction,
  selectSummonDestination,
  selectSummonHandCard,
  type BattleInteractionState
} from "../../../apps/web/src/battle/battleInteraction";
import {
  attemptRuntimeCommand,
  createBattleRuntimeSession
} from "../../../apps/web/src/battle/battleRuntimeService";
import { battleStateArbitrary } from "../generators/battleGenerators";

describe("battle summon interaction", () => {
  it("starts, switches directly, and cancels by re-clicking the selected card", () => {
    const { state, firstId, secondId } = createInteractionState();
    const first = selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId);
    const switched = selectSummonHandCard(first, state, secondId);
    const cancelled = selectSummonHandCard(switched, state, secondId);

    expect(first).toMatchObject({ kind: "selecting-summon", handInstanceId: firstId });
    expect(switched).toMatchObject({ kind: "selecting-summon", handInstanceId: secondId });
    expect(cancelled).toBe(IDLE_BATTLE_INTERACTION);
  });

  it("keeps the current draft when another unavailable card is selected", () => {
    const { state, firstId } = createInteractionState();
    const interaction = selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId);
    const next = selectSummonHandCard(interaction, state, "missing-card");

    expect(next).toBe(interaction);
  });

  it("selects only candidates and treats non-candidate squares as a silent no-op", () => {
    const { state, firstId } = createInteractionState();
    const interaction = selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId);
    const ignored = selectSummonDestination(interaction, { column: 5, row: 8 });
    const selected = selectSummonDestination(interaction, { column: 3, row: 9 });
    const replaced = selectSummonDestination(selected, { column: 9, row: 9 });

    expect(ignored).toBe(interaction);
    expect(selected).toMatchObject({ destination: { column: 3, row: 9 } });
    expect(replaced).toMatchObject({ destination: { column: 9, row: 9 } });
  });

  it("prepares one complete summon command only after destination selection", () => {
    const { state, firstId } = createInteractionState();
    const started = selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId);
    const incomplete = prepareSummonConfirmation(started, state);
    const selected = selectSummonDestination(started, { column: 7, row: 9 });
    const ready = prepareSummonConfirmation(selected, state);

    expect(incomplete).toEqual({ ok: false, interaction: started });
    expect(ready).toEqual({
      ok: true,
      command: {
        type: "summonCreature",
        side: "player",
        handInstanceId: firstId,
        destination: { column: 7, row: 9 }
      }
    });
  });

  it("refreshes a viable stale draft and clears only an invalid destination", () => {
    const { state, firstId } = createInteractionState();
    const selected = selectSummonDestination(
      selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId),
      { column: 3, row: 9 }
    );
    const staleState = {
      ...state,
      board: setBoardOccupant(state.board, { column: 3, row: 9 }, "blocker")
    };
    const result = prepareSummonConfirmation(selected, staleState);

    expect(result.ok).toBe(false);
    if (result.ok || result.interaction.kind !== "selecting-summon") {
      return;
    }

    expect(result.interaction.destination).toBeUndefined();
    expect(result.interaction.candidateDestinations).toHaveLength(5);
    expect(result.interaction.issue?.code).toBe("battle.board.occupied");
  });

  it("returns to idle when a stale card is no longer viable", () => {
    const { state, firstId } = createInteractionState();
    const selected = selectSummonDestination(
      selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId),
      { column: 3, row: 9 }
    );
    const staleState: BattleState = {
      ...state,
      players: {
        ...state.players,
        player: { ...state.players.player, currentPp: 0 }
      }
    };
    const result = prepareSummonConfirmation(selected, staleState);

    expect(result).toMatchObject({
      ok: false,
      interaction: {
        kind: "idle",
        issue: { code: "battle.resource.pp-insufficient" }
      }
    });
  });

  it("recovers from runtime rejection and preserves a still-current destination", () => {
    const { state, firstId } = createInteractionState();
    const selected = selectSummonDestination(
      selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId),
      { column: 3, row: 9 }
    );
    const recovered = recoverSummonInteraction(state, selected, [
      {
        code: "battle.board.occupied",
        message: "The destination changed before confirmation."
      }
    ]);

    expect(recovered).toMatchObject({
      kind: "selecting-summon",
      destination: { column: 3, row: 9 },
      issue: { code: "battle.board.occupied" }
    });
  });

  it("cancels without touching confirmed state and blocks phase end while pending", () => {
    const { state, firstId } = createInteractionState();
    const before = JSON.stringify(state);
    const interaction = selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId);
    const guarded = guardEndPlayPhase(interaction);
    const cancelled = cancelBattleInteraction();

    expect(guarded).toMatchObject({
      kind: "selecting-summon",
      issue: { code: "battle.interaction.pending" }
    });
    expect(cancelled).toBe(IDLE_BATTLE_INTERACTION);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("projects stable control flags, selected card details, and candidate keys", () => {
    const { state, firstId } = createInteractionState();
    const started = selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId);
    const selected = selectSummonDestination(started, { column: 5, row: 9 });
    const idleView = projectBattleInteractionFromState(IDLE_BATTLE_INTERACTION, state);
    const selectingView = projectBattleInteractionFromState(selected, state);

    expect(idleView).toMatchObject({
      kind: "idle",
      confirmEnabled: false,
      cancelEnabled: false,
      endPlayPhaseEnabled: true
    });
    expect(selectingView).toMatchObject({
      kind: "selecting-summon",
      selectedHandInstanceId: firstId,
      selectedDestinationKey: "5:9",
      confirmEnabled: true,
      cancelEnabled: true,
      endPlayPhaseEnabled: false
    });
    expect(selectingView.candidateDestinationKeys).toEqual([
      "3:9", "4:9", "5:9", "7:9", "8:9", "9:9"
    ]);
  });

  it("submits a prepared summon through runtime and mutates only the accepted session", () => {
    const { state, firstId } = createInteractionState();
    const selected = selectSummonDestination(
      selectSummonHandCard(IDLE_BATTLE_INTERACTION, state, firstId),
      { column: 7, row: 9 }
    );
    const preparation = prepareSummonConfirmation(selected, state);
    const session = createBattleRuntimeSession(state, []);

    if (!preparation.ok) {
      throw new Error("Expected a complete summon preparation.");
    }

    const submission = attemptRuntimeCommand(session, preparation.command, {
      validationIssues: vi.fn(),
      events: vi.fn(),
      cpuStop: vi.fn(),
      seed: vi.fn()
    });

    expect(submission.ok).toBe(true);
    expect(session.state.players.player.handZone).toContain(firstId);
    expect(session.state.players.player.currentPp).toBe(10);
    expect(submission.session).not.toBe(session);
    expect(submission.session.state.players.player.handZone).not.toContain(firstId);
    expect(submission.session.state.players.player.currentPp).toBe(8);
    expect(submission.session.log.entries.map((entry) => entry.type)).toEqual([
      "creature.summoned",
      "resonance.changed"
    ]);
  });
});

function createInteractionState(): {
  readonly state: BattleState;
  readonly firstId: string;
  readonly secondId: string;
} {
  const sampled = fc.sample(battleStateArbitrary, { numRuns: 1, seed: 4305 })[0];
  const [first, second] = Object.values(sampled.cardInstances).filter(
    (card) => card.ownerSide === "player"
  );

  if (!first || !second) {
    throw new Error("Expected two player card fixtures.");
  }

  const firstCreature = toHandCreature(first, 2);
  const secondCreature = toHandCreature(second, 3);

  return {
    firstId: firstCreature.instanceId,
    secondId: secondCreature.instanceId,
    state: {
      ...sampled,
      phase: "play",
      activeSide: "player",
      terminalResult: undefined,
      board: createInitialBattleBoard(),
      players: {
        ...sampled.players,
        player: {
          ...sampled.players.player,
          handZone: [firstCreature.instanceId, secondCreature.instanceId],
          deckZone: sampled.players.player.deckZone.filter(
            (id) => id !== firstCreature.instanceId && id !== secondCreature.instanceId
          ),
          currentPp: 10,
          maxPp: 10
        }
      },
      cardInstances: {
        ...sampled.cardInstances,
        [firstCreature.instanceId]: firstCreature,
        [secondCreature.instanceId]: secondCreature
      }
    }
  };
}

function toHandCreature(card: BattleCardInstance, currentCost: number): BattleCardInstance {
  return {
    ...card,
    type: "creature",
    zone: "hand",
    position: undefined,
    cost: currentCost,
    currentCost,
    attack: card.attack ?? 3,
    currentAttack: card.currentAttack ?? card.attack ?? 3,
    health: card.health ?? 4,
    currentHp: card.currentHp ?? card.health ?? 4,
    maxHp: card.maxHp ?? card.health ?? 4,
    movement: 2,
    summonedThisTurn: false,
    movedThisTurn: false
  };
}
