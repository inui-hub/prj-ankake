import type {
  BattleCardInstance,
  BattleSide,
  BattleState,
  BoardCoordinate,
  LegalAction
} from "./types";

export interface BattleBoardSquareView {
  readonly key: string;
  readonly coordinate: BoardCoordinate;
  readonly terrain: string;
  readonly occupant?: BattleCardInstance;
}

export interface PublicBattleView {
  readonly phase: BattleState["phase"];
  readonly activeSide: BattleSide;
  readonly turnNumber: number;
  readonly playerBaseHp: number;
  readonly cpuBaseHp: number;
  readonly playerHandCount: number;
  readonly cpuHandCount: number;
  readonly playerDeckCount: number;
  readonly cpuDeckCount: number;
  readonly boardSquares: readonly BattleBoardSquareView[];
  readonly legalActions: readonly LegalAction[];
  readonly terminalResult: BattleState["terminalResult"];
}

export function projectPublicBattleView(
  state: BattleState,
  legalActions: readonly LegalAction[] = []
): PublicBattleView {
  return {
    phase: state.phase,
    activeSide: state.activeSide,
    turnNumber: state.metadata.turnNumber,
    playerBaseHp: state.players.player.baseHp,
    cpuBaseHp: state.players.cpu.baseHp,
    playerHandCount: state.players.player.handZone.length,
    cpuHandCount: state.players.cpu.handZone.length,
    playerDeckCount: state.players.player.deckZone.length,
    cpuDeckCount: state.players.cpu.deckZone.length,
    boardSquares: state.board.squares.map((square) => ({
      key: `${square.coordinate.column}:${square.coordinate.row}`,
      coordinate: square.coordinate,
      terrain: square.terrain,
      occupant: square.occupantId ? state.cardInstances[square.occupantId] : undefined
    })),
    legalActions,
    terminalResult: state.terminalResult
  };
}
