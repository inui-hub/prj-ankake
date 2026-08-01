import type {
  CardAttribute,
  CardMasterRecord,
  StaticCatalogSnapshot,
  TokenMasterRecord
} from "../catalog/types";
import type { DeckId, SavedDeck } from "../deck/types";

export type BattleSide = "player" | "cpu";
export type BattlePhase = "play" | "automatic" | "terminal";
export type BattleZone = "deck" | "hand" | "board" | "graveyard";
export type FirstPlayerMode = "random" | "player-first" | "player-second";
export type BattleCardInstanceId = string;
export type BattleId = string;

export interface BoardCoordinate {
  readonly column: number;
  readonly row: number;
}

export type BoardTerrain = "normal" | "player-base" | "cpu-base" | "neutral-base";

export interface BoardSquare {
  readonly coordinate: BoardCoordinate;
  readonly lane: BattleLane;
  readonly terrain: BoardTerrain;
  readonly occupantId?: BattleCardInstanceId;
}

export type BattleLane = "left" | "center" | "right";

export interface BattleBoard {
  readonly squares: readonly BoardSquare[];
}

export interface BattleDeckSnapshot {
  readonly sourceDeckId: DeckId;
  readonly sourceDeckName: string;
  readonly cards: readonly string[];
  readonly capturedAt: string;
}

export interface BattleRngState {
  readonly seed: number;
  readonly position: number;
}

export interface BattleMetadata {
  readonly battleId: BattleId;
  readonly setup: BattleSetupConfig;
  readonly startedAt: string;
  readonly firstPlayer: BattleSide;
  readonly turnNumber: number;
  readonly elapsedSeconds: number;
  readonly rng: BattleRngState;
}

export interface BattleSetupConfig {
  readonly playerDeckId: DeckId;
  readonly cpuDeckId: DeckId;
  readonly firstPlayerMode: FirstPlayerMode;
  readonly seed: string;
}

export type ResonanceMap = Readonly<Record<BattleLane, Readonly<Record<CardAttribute, number>>>>;

export interface PlayerBattleState {
  readonly side: BattleSide;
  readonly deckSnapshot: BattleDeckSnapshot;
  readonly deckZone: readonly BattleCardInstanceId[];
  readonly handZone: readonly BattleCardInstanceId[];
  readonly graveyardZone: readonly BattleCardInstanceId[];
  readonly currentPp: number;
  readonly maxPp: number;
  readonly baseHp: number;
  readonly resonance: ResonanceMap;
  readonly turnsStarted: number;
}

export interface BattleCardInstance {
  readonly instanceId: BattleCardInstanceId;
  readonly catalogCardId: string;
  readonly ownerSide: BattleSide;
  readonly controllerSide: BattleSide;
  readonly zone: BattleZone;
  readonly name: string;
  readonly type: CardMasterRecord["type"] | TokenMasterRecord["type"];
  readonly attribute: CardAttribute;
  readonly cost: number;
  readonly currentCost: number;
  readonly attack?: number;
  readonly currentAttack?: number;
  readonly health?: number;
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly movement: number;
  readonly isToken: boolean;
  readonly effectText: string;
  readonly effectIds: readonly string[];
  readonly position?: BoardCoordinate;
  readonly summonedThisTurn: boolean;
  readonly movedThisTurn: boolean;
}

export type BattleTerminalReason =
  | "base-destroyed"
  | "deck-out"
  | "quit"
  | "processing-limit";

export interface BattleTerminalResult {
  readonly winner: BattleSide;
  readonly loser: BattleSide;
  readonly reason: BattleTerminalReason;
  readonly turnNumber: number;
  readonly elapsedSeconds: number;
  readonly finalEventSequence: number;
}

export interface BattleState {
  readonly battleId: BattleId;
  readonly phase: BattlePhase;
  readonly activeSide: BattleSide;
  readonly board: BattleBoard;
  readonly players: Readonly<Record<BattleSide, PlayerBattleState>>;
  readonly cardInstances: Readonly<Record<BattleCardInstanceId, BattleCardInstance>>;
  readonly metadata: BattleMetadata;
  readonly eventCursor: number;
  readonly terminalResult?: BattleTerminalResult;
}

export interface BattleEvent {
  readonly sequence: number;
  readonly type: BattleEventType;
  readonly message: string;
  readonly side?: BattleSide;
  readonly instanceId?: BattleCardInstanceId;
  readonly data?: Readonly<Record<string, string | number | boolean>>;
}

export type BattleEventType =
  | "battle.started"
  | "first-player.decided"
  | "card.drawn"
  | "card.overflowed"
  | "card.played"
  | "creature.summoned"
  | "creature.moved"
  | "spell.resolved"
  | "effect.fizzled"
  | "effect.partially-resolved"
  | "resonance.changed"
  | "phase.ended"
  | "standby.resolved"
  | "attack.resolved"
  | "base.damaged"
  | "deck-out.occurred"
  | "cpu.processing-limit-reached"
  | "battle.ended";

export type BattleValidationIssueCode =
  | "battle.terminal"
  | "battle.phase.invalid"
  | "battle.side.inactive"
  | "battle.card.not-found"
  | "battle.card.zone-invalid"
  | "battle.card.owner-invalid"
  | "battle.card.type-invalid"
  | "battle.resource.pp-insufficient"
  | "battle.board.coordinate-invalid"
  | "battle.board.occupied"
  | "battle.board.destination-invalid"
  | "battle.summon.no-destination"
  | "battle.move.path-invalid"
  | "battle.move.too-far"
  | "battle.move.already-moved"
  | "battle.effect.no-target";

export interface BattleValidationIssue {
  readonly code: BattleValidationIssueCode;
  readonly message: string;
  readonly path?: string;
}

export type SummonStartResult =
  | {
      readonly eligible: true;
      readonly handInstanceId: BattleCardInstanceId;
      readonly candidateDestinations: readonly BoardCoordinate[];
      readonly issues: readonly [];
    }
  | {
      readonly eligible: false;
      readonly handInstanceId: BattleCardInstanceId;
      readonly candidateDestinations: readonly [];
      readonly issues: readonly BattleValidationIssue[];
    };

export type BattleCommand =
  | {
      readonly type: "summonCreature";
      readonly side: BattleSide;
      readonly handInstanceId: BattleCardInstanceId;
      readonly destination: BoardCoordinate;
    }
  | {
      readonly type: "castSpell";
      readonly side: BattleSide;
      readonly handInstanceId: BattleCardInstanceId;
      readonly targetInstanceId?: BattleCardInstanceId;
    }
  | {
      readonly type: "moveCreature";
      readonly side: BattleSide;
      readonly creatureInstanceId: BattleCardInstanceId;
      readonly path: readonly BoardCoordinate[];
    }
  | {
      readonly type: "endPlayPhase";
      readonly side: BattleSide;
      readonly reason: "manual" | "timer" | "cpu";
    };

export type BattleCommandResult =
  | {
      readonly ok: true;
      readonly state: BattleState;
      readonly events: readonly BattleEvent[];
    }
  | {
      readonly ok: false;
      readonly state: BattleState;
      readonly issues: readonly BattleValidationIssue[];
    };

export interface BattleSetupInput {
  readonly playerDeck: SavedDeck;
  readonly cpuDeck: SavedDeck;
  readonly firstPlayerMode: FirstPlayerMode;
  readonly catalog: StaticCatalogSnapshot;
  readonly seed?: string;
  readonly now: string;
}

export type BattleSetupIssueCode =
  | "battle-setup.player-deck-invalid"
  | "battle-setup.cpu-deck-invalid"
  | "battle-setup.card-missing";

export interface BattleSetupIssue {
  readonly code: BattleSetupIssueCode;
  readonly message: string;
  readonly deckId?: DeckId;
  readonly cardId?: string;
}

export type BattleSetupResult =
  | {
      readonly ok: true;
      readonly state: BattleState;
      readonly events: readonly BattleEvent[];
    }
  | {
      readonly ok: false;
      readonly issues: readonly BattleSetupIssue[];
    };

export interface LegalAction {
  readonly command: BattleCommand;
  readonly label: string;
  readonly scoreHint: number;
}

export interface BattleLogEntry {
  readonly sequence: number;
  readonly message: string;
  readonly type: BattleEventType;
  readonly side?: BattleSide;
}

export interface BattleLogState {
  readonly entries: readonly BattleLogEntry[];
  readonly terminalSummary?: BattleTerminalResult;
}
