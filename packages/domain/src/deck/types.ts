import type {
  CardAttribute,
  CardMasterRecord,
  CardType
} from "../catalog/types";

export const DECK_MIN_SAVEABLE_CARDS = 0;
export const DECK_BATTLE_READY_CARD_COUNT = 40;
export const DECK_MAX_CARD_COPIES = 4;
export const DECK_MAX_SAVED_DECKS = 20;
export const DECK_NAME_MAX_LENGTH = 30;
export const DECK_DEFAULT_NAME = "New Deck";

export type DeckId = string;
export type CardId = string;
export type DeckName = string;

export interface DeckCardCount {
  readonly cardId: CardId;
  readonly count: number;
}

export interface SavedDeck {
  readonly deckId: DeckId;
  readonly name: DeckName;
  readonly cards: readonly DeckCardCount[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SavedDeckSummary {
  readonly deckId: DeckId;
  readonly name: DeckName;
  readonly cardCount: number;
  readonly battleReady: boolean;
  readonly updatedAt: string;
}

export interface DeckDraft {
  readonly deckId: DeckId;
  readonly name: DeckName;
  readonly cards: readonly DeckCardCount[];
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly savedSnapshot?: SavedDeck;
}

export type DeckMutationRejectReason =
  | "unknown-card"
  | "token-card"
  | "copy-limit"
  | "deck-limit"
  | "card-not-present";

export type DeckMutationResult =
  | {
      readonly accepted: true;
      readonly draft: DeckDraft;
    }
  | {
      readonly accepted: false;
      readonly draft: DeckDraft;
      readonly reason: DeckMutationRejectReason;
    };

export type DeckValidationIssueCode =
  | "deck.name.required"
  | "deck.name.too-long"
  | "deck.count.below-minimum"
  | "deck.count.above-maximum"
  | "deck.card.unknown"
  | "deck.card.token"
  | "deck.card.copy-limit"
  | "deck.card.count-invalid";

export interface DeckValidationIssue {
  readonly code: DeckValidationIssueCode;
  readonly message: string;
  readonly cardId?: CardId;
  readonly path?: string;
}

export interface DeckValidationResult {
  readonly issues: readonly DeckValidationIssue[];
  readonly saveable: boolean;
  readonly battleReady: boolean;
  readonly cardCount: number;
}

export type DeckCostFilter = "all" | "0-2" | "3-5" | "6-plus";
export type CardSortKey = "name" | "cost" | "type" | "attribute";
export type CardSortDirection = "asc" | "desc";

export interface CardSearchCriteria {
  readonly query: string;
  readonly type: "all" | CardType;
  readonly attribute: "all" | CardAttribute;
  readonly cost: DeckCostFilter;
  readonly sortKey: CardSortKey;
  readonly sortDirection: CardSortDirection;
  /**
   * Presentation-only comparison inputs.  They are deliberately part of the
   * transient search criteria, never a saved deck.
   */
  readonly comparisonLocale?: string;
  readonly localizedNames?: Readonly<Record<CardId, string>>;
}

export interface DeckCardRow {
  readonly card: CardMasterRecord;
  readonly currentCount: number;
  readonly canAdd: boolean;
  readonly addDisabledReason?: string;
}

export interface DeckContentsRow {
  readonly card: CardMasterRecord;
  readonly count: number;
  readonly canAdd: boolean;
  readonly canRemove: boolean;
}

export interface DeckCostBucket {
  readonly label: string;
  readonly count: number;
}

export interface DeckStats {
  readonly totalCards: number;
  readonly typeCounts: Readonly<Record<CardType, number>>;
  readonly attributeCounts: Readonly<Record<CardAttribute, number>>;
  readonly costBuckets: readonly DeckCostBucket[];
}

export type DeckDialogState =
  | {
      readonly kind: "none";
    }
  | {
      readonly kind: "card-detail";
      readonly cardId: CardId;
    }
  | {
      readonly kind: "delete-deck";
      readonly deckId: DeckId;
    }
  | {
      readonly kind: "unsaved-changes";
      readonly intent: PendingDeckIntent;
    }
  | {
      readonly kind: "local-data-error";
      readonly title: string;
      readonly message: string;
    };

export type PendingDeckIntent =
  | {
      readonly kind: "return-menu";
    }
  | {
      readonly kind: "new-deck";
    }
  | {
      readonly kind: "load-deck";
      readonly deckId: DeckId;
    };

export interface DeckCapState {
  readonly maxDecks: number;
  readonly savedDeckCount: number;
  readonly reached: boolean;
}

export interface DeckBuildingViewModel {
  readonly draft: DeckDraft;
  readonly savedDecks: readonly SavedDeckSummary[];
  readonly selectedDeckId?: DeckId;
  readonly criteria: CardSearchCriteria;
  readonly cardRows: readonly DeckCardRow[];
  readonly deckContents: readonly DeckContentsRow[];
  readonly stats: DeckStats;
  readonly validation: DeckValidationResult;
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly loading: boolean;
  readonly deleting: boolean;
  readonly capState: DeckCapState;
  readonly selectedCard?: CardMasterRecord;
  readonly dialog: DeckDialogState;
}
