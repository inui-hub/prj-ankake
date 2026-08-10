import type { CardMasterRecord, StaticCatalogSnapshot } from "../catalog/types";
import { getDeckTotalCount, normalizeDeckCards } from "../deck/operations";
import { DECK_BATTLE_READY_CARD_COUNT, type SavedDeck } from "../deck/types";
import { createInitialBattleBases } from "./bases";
import { createInitialBattleBoard, getLane, setBoardOccupant } from "./board";
import {
  BATTLE_BASE_MOVEMENT,
  BATTLE_STARTING_HAND_SIZE,
  BATTLE_STARTING_PP
} from "./constants";
import { createEmptyResonance } from "./resonance";
import { createBattleRng, shuffleWithRng, type BattleRng } from "./rng";
import type {
  BattleCardInstance,
  BattleCardInstanceId,
  BattleDeckSnapshot,
  BattleEvent,
  BattleSetupInput,
  BattleSetupIssue,
  BattleSetupResult,
  BattleSide,
  BattleState,
  FirstPlayerMode,
  PlayerBattleState
} from "./types";

export function createBattleState(input: BattleSetupInput): BattleSetupResult {
  const issues = validateSetupDeck(input.playerDeck, "player", input.catalog).concat(
    validateSetupDeck(input.cpuDeck, "cpu", input.catalog)
  );

  if (issues.length > 0) {
    return {
      ok: false,
      issues
    };
  }

  const seed = input.seed ?? `${input.now}:${input.playerDeck.deckId}:${input.cpuDeck.deckId}`;
  let rng = createBattleRng(seed);
  const [firstPlayer, firstPlayerRng] = decideFirstPlayer(input.firstPlayerMode, rng);
  rng = firstPlayerRng;

  const playerSnapshot = createBattleDeckSnapshot(input.playerDeck, input.now);
  const cpuSnapshot = createBattleDeckSnapshot(input.cpuDeck, input.now);
  const [playerInstances, playerDeckOrder, afterPlayerShuffle] = createShuffledInstances(
    playerSnapshot,
    "player",
    input.catalog,
    rng
  );
  const [cpuInstances, cpuDeckOrder, afterCpuShuffle] = createShuffledInstances(
    cpuSnapshot,
    "cpu",
    input.catalog,
    afterPlayerShuffle
  );
  rng = afterCpuShuffle;

  const cardInstances: Record<BattleCardInstanceId, BattleCardInstance> = {
    ...playerInstances,
    ...cpuInstances
  };
  const [playerState, playerDrawEvents] = createInitialPlayerState(
    "player",
    playerSnapshot,
    playerDeckOrder,
    cardInstances,
    2
  );
  const [cpuState, cpuDrawEvents] = createInitialPlayerState(
    "cpu",
    cpuSnapshot,
    cpuDeckOrder,
    cardInstances,
    2 + playerDrawEvents.length
  );
  const battleId = `battle-${seed}`;
  const startedEvent: BattleEvent = {
    sequence: 1,
    type: "battle.started",
    message: "Battle started."
  };
  const firstPlayerEvent: BattleEvent = {
    sequence: 2 + playerDrawEvents.length + cpuDrawEvents.length,
    type: "first-player.decided",
    side: firstPlayer,
    message: `${labelSide(firstPlayer)} takes the first turn.`
  };

  return {
    ok: true,
    state: {
      battleId,
      phase: "play",
      activeSide: firstPlayer,
      board: createInitialBattleBoard(),
      bases: createInitialBattleBases(),
      players: {
        player: playerState,
        cpu: cpuState
      },
      cardInstances,
      metadata: {
        battleId,
        setup: {
          playerDeckId: input.playerDeck.deckId,
          cpuDeckId: input.cpuDeck.deckId,
          firstPlayerMode: input.firstPlayerMode,
          seed
        },
        startedAt: input.now,
        firstPlayer,
        turnNumber: 1,
        elapsedSeconds: 0,
        rng: rng.state
      },
      eventCursor: firstPlayerEvent.sequence,
      terminalResult: undefined
    },
    events: [startedEvent, ...playerDrawEvents, ...cpuDrawEvents, firstPlayerEvent]
  };
}

export function placeCreatureForTest(
  state: BattleState,
  instanceId: BattleCardInstanceId,
  side: BattleSide,
  column: number,
  row: number
): BattleState {
  const card = state.cardInstances[instanceId];
  if (!card) {
    return state;
  }

  const coordinate = { column, row };
  const player = state.players[side];
  const boardEntrySequence = Math.max(
    state.eventCursor,
    ...Object.values(state.cardInstances)
      .filter((instance) => instance.zone === "board")
      .map((instance) => instance.boardEntrySequence ?? 0)
  ) + 1;
  return {
    ...state,
    board: setBoardOccupant(state.board, coordinate, instanceId),
    players: {
      ...state.players,
      [side]: {
        ...player,
        handZone: player.handZone.filter((id) => id !== instanceId)
      }
    },
    cardInstances: {
      ...state.cardInstances,
      [instanceId]: {
        ...card,
        zone: "board",
        position: coordinate,
        boardEntrySequence
      }
    },
    eventCursor: boardEntrySequence
  };
}

function validateSetupDeck(
  deck: SavedDeck,
  side: BattleSide,
  catalog: StaticCatalogSnapshot
): readonly BattleSetupIssue[] {
  const issues: BattleSetupIssue[] = [];
  const normalizedCards = normalizeDeckCards(deck.cards);

  if (getDeckTotalCount(normalizedCards) !== DECK_BATTLE_READY_CARD_COUNT) {
    issues.push({
      code: side === "player" ? "battle-setup.player-deck-invalid" : "battle-setup.cpu-deck-invalid",
      message: `${labelSide(side)} deck must contain ${DECK_BATTLE_READY_CARD_COUNT} cards.`,
      deckId: deck.deckId
    });
  }

  for (const entry of normalizedCards) {
    if (!catalog.cardsById.has(entry.cardId)) {
      issues.push({
        code: "battle-setup.card-missing",
        message: `Deck contains an unknown card: ${entry.cardId}.`,
        deckId: deck.deckId,
        cardId: entry.cardId
      });
    }
  }

  return issues;
}

function createBattleDeckSnapshot(deck: SavedDeck, now: string): BattleDeckSnapshot {
  return {
    sourceDeckId: deck.deckId,
    sourceDeckName: deck.name,
    cards: normalizeDeckCards(deck.cards).flatMap((entry) =>
      Array.from({ length: entry.count }, () => entry.cardId)
    ),
    capturedAt: now
  };
}

function decideFirstPlayer(
  mode: FirstPlayerMode,
  rng: BattleRng
): readonly [BattleSide, BattleRng] {
  if (mode === "player-first") {
    return ["player", rng];
  }

  if (mode === "player-second") {
    return ["cpu", rng];
  }

  const [index, nextRng] = rng.nextInt(2);
  return [index === 0 ? "player" : "cpu", nextRng];
}

function createShuffledInstances(
  snapshot: BattleDeckSnapshot,
  side: BattleSide,
  catalog: StaticCatalogSnapshot,
  rng: BattleRng
): readonly [
  Readonly<Record<BattleCardInstanceId, BattleCardInstance>>,
  readonly BattleCardInstanceId[],
  BattleRng
] {
  const instances: Record<BattleCardInstanceId, BattleCardInstance> = {};
  const ids = snapshot.cards.map((cardId, index) => {
    const card = catalog.cardsById.get(cardId) as CardMasterRecord;
    const instanceId = `${side}-${index + 1}-${cardId}`;
    instances[instanceId] = createCardInstance(instanceId, card, side);
    return instanceId;
  });
  const [shuffledIds, nextRng] = shuffleWithRng(ids, rng);
  return [instances, shuffledIds, nextRng];
}

function createInitialPlayerState(
  side: BattleSide,
  snapshot: BattleDeckSnapshot,
  deckOrder: readonly BattleCardInstanceId[],
  cardInstances: Record<BattleCardInstanceId, BattleCardInstance>,
  firstSequence: number
): readonly [PlayerBattleState, readonly BattleEvent[]] {
  const handZone = deckOrder.slice(0, BATTLE_STARTING_HAND_SIZE);
  const deckZone = deckOrder.slice(BATTLE_STARTING_HAND_SIZE);
  const events = handZone.map((instanceId, index) => {
    cardInstances[instanceId] = {
      ...cardInstances[instanceId] as BattleCardInstance,
      zone: "hand"
    };
    return {
      sequence: firstSequence + index,
      type: "card.drawn" as const,
      side,
      instanceId,
      message: `${labelSide(side)} drew a card.`
    };
  });

  return [
    {
      side,
      deckSnapshot: snapshot,
      deckZone,
      handZone,
      graveyardZone: [],
      currentPp: BATTLE_STARTING_PP,
      maxPp: BATTLE_STARTING_PP,
      resonance: createEmptyResonance(),
      turnsStarted: side === "player" ? 1 : 0
    },
    events
  ];
}

function createCardInstance(
  instanceId: BattleCardInstanceId,
  card: CardMasterRecord,
  side: BattleSide
): BattleCardInstance {
  return {
    instanceId,
    catalogCardId: card.id,
    ownerSide: side,
    controllerSide: side,
    zone: "deck",
    name: card.name,
    type: card.type,
    attribute: card.attribute,
    cost: card.cost,
    currentCost: card.cost,
    attack: card.type === "creature" ? card.attack : undefined,
    currentAttack: card.type === "creature" ? card.attack : undefined,
    health: card.type === "creature" ? card.health : undefined,
    currentHp: card.type === "creature" ? card.health : undefined,
    maxHp: card.type === "creature" ? card.health : undefined,
    movement: card.type === "creature" ? BATTLE_BASE_MOVEMENT : 0,
    isToken: false,
    effectText: card.effectText,
    effectIds: card.effectIds,
    summonedThisTurn: false,
    movedThisTurn: false
  };
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
