import type {
  BattleBaseId,
  BattleBaseKind,
  BattleBaseOwner,
  BattleBaseState,
  BattleBaseStateMap,
  BattleSide,
  BoardCoordinate
} from "./types";

interface BattleBaseDefinition {
  readonly id: BattleBaseId;
  readonly label: string;
  readonly coordinate: BoardCoordinate;
  readonly kind: BattleBaseKind;
  readonly initialOwner: BattleBaseOwner;
  readonly maxHp: number;
}

export const BATTLE_BASE_IDS = Object.freeze([
  "cpu-base",
  "neutral-left",
  "neutral-center",
  "neutral-right",
  "player-base"
] as const);

const BATTLE_BASE_DEFINITIONS: Readonly<Record<BattleBaseId, BattleBaseDefinition>> =
  Object.freeze({
    "cpu-base": createDefinition(
      "cpu-base",
      "CPU Base",
      6,
      1,
      "player-base",
      "cpu",
      20
    ),
    "neutral-left": createDefinition(
      "neutral-left",
      "Left Neutral Base",
      2,
      5,
      "neutral-base",
      "none",
      10
    ),
    "neutral-center": createDefinition(
      "neutral-center",
      "Center Neutral Base",
      6,
      5,
      "neutral-base",
      "none",
      20
    ),
    "neutral-right": createDefinition(
      "neutral-right",
      "Right Neutral Base",
      10,
      5,
      "neutral-base",
      "none",
      10
    ),
    "player-base": createDefinition(
      "player-base",
      "Player Base",
      6,
      9,
      "player-base",
      "player",
      20
    )
  });

export function createInitialBattleBases(): BattleBaseStateMap {
  return Object.fromEntries(
    BATTLE_BASE_IDS.map((id) => {
      const definition = BATTLE_BASE_DEFINITIONS[id];
      return [
        id,
        {
          id,
          coordinate: { ...definition.coordinate },
          kind: definition.kind,
          owner: definition.initialOwner,
          currentHp: definition.maxHp,
          maxHp: definition.maxHp
        } satisfies BattleBaseState
      ];
    })
  ) as Record<BattleBaseId, BattleBaseState>;
}

export function getBattleBaseById(
  bases: BattleBaseStateMap,
  baseId: BattleBaseId
): BattleBaseState {
  return bases[baseId];
}

export function getBattleBaseAt(
  bases: BattleBaseStateMap,
  coordinate: BoardCoordinate
): BattleBaseState | undefined {
  return BATTLE_BASE_IDS.map((id) => bases[id]).find(
    (base) =>
      base.coordinate.column === coordinate.column &&
      base.coordinate.row === coordinate.row
  );
}

export function getOwnedNeutralBases(
  bases: BattleBaseStateMap,
  side: BattleSide
): readonly BattleBaseState[] {
  return BATTLE_BASE_IDS.map((id) => bases[id]).filter(
    (base) => base.kind === "neutral-base" && base.owner === side
  );
}

export function getPlayerBaseId(side: BattleSide): BattleBaseId {
  return side === "player" ? "player-base" : "cpu-base";
}

export function getBattleBaseLabel(baseId: BattleBaseId): string {
  return BATTLE_BASE_DEFINITIONS[baseId].label;
}

export function updateBattleBase(
  bases: BattleBaseStateMap,
  baseId: BattleBaseId,
  update: (base: BattleBaseState) => BattleBaseState
): BattleBaseStateMap {
  const nextBase = update(bases[baseId]);
  return {
    ...bases,
    [baseId]: { ...nextBase, id: baseId }
  };
}

function createDefinition(
  id: BattleBaseId,
  label: string,
  column: number,
  row: number,
  kind: BattleBaseKind,
  initialOwner: BattleBaseOwner,
  maxHp: number
): BattleBaseDefinition {
  return Object.freeze({
    id,
    label,
    coordinate: Object.freeze({ column, row }),
    kind,
    initialOwner,
    maxHp
  });
}
