import type {
  BattleCardInstance,
  BattleSide,
  BattleState,
  BoardCoordinate,
  LegalAction
} from "@ankake/domain";

export interface CpuVisibleCard {
  readonly instanceId: string;
  readonly name: string;
  readonly type: BattleCardInstance["type"];
  readonly side: BattleSide;
  readonly attack?: number;
  readonly hp?: number;
  readonly position?: BoardCoordinate;
}

export interface CpuVisibleState {
  readonly activeSide: BattleSide;
  readonly phase: BattleState["phase"];
  readonly turnNumber: number;
  readonly cpuHand: readonly CpuVisibleCard[];
  readonly cpuHandCount: number;
  readonly playerHandCount: number;
  readonly cpuDeckCount: number;
  readonly playerDeckCount: number;
  readonly cpuBaseHp: number;
  readonly playerBaseHp: number;
  readonly boardCards: readonly CpuVisibleCard[];
  readonly legalActions: readonly LegalAction[];
}

export function projectCpuVisibleState(
  state: BattleState,
  legalActions: readonly LegalAction[]
): CpuVisibleState {
  return {
    activeSide: state.activeSide,
    phase: state.phase,
    turnNumber: state.metadata.turnNumber,
    cpuHand: state.players.cpu.handZone
      .map((instanceId) => state.cardInstances[instanceId])
      .filter((card): card is BattleCardInstance => Boolean(card))
      .map(toVisibleCard),
    cpuHandCount: state.players.cpu.handZone.length,
    playerHandCount: state.players.player.handZone.length,
    cpuDeckCount: state.players.cpu.deckZone.length,
    playerDeckCount: state.players.player.deckZone.length,
    cpuBaseHp: state.players.cpu.baseHp,
    playerBaseHp: state.players.player.baseHp,
    boardCards: Object.values(state.cardInstances)
      .filter((card) => card.zone === "board")
      .map(toVisibleCard),
    legalActions
  };
}

export function assertCpuVisibleStateIsRedacted(visible: CpuVisibleState): boolean {
  return (
    visible.playerHandCount >= 0 &&
    visible.playerDeckCount >= 0 &&
    !("playerHand" in visible) &&
    !("playerDeck" in visible) &&
    !("deckZone" in visible) &&
    !("cardInstances" in visible)
  );
}

function toVisibleCard(card: BattleCardInstance): CpuVisibleCard {
  return {
    instanceId: card.instanceId,
    name: card.name,
    type: card.type,
    side: card.controllerSide,
    attack: card.currentAttack,
    hp: card.currentHp,
    position: card.position
  };
}
