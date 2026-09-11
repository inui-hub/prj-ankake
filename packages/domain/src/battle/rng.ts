import type { BattleRngState } from "./types";

export interface BattleRng {
  readonly state: BattleRngState;
  next(): readonly [number, BattleRng];
  nextInt(maxExclusive: number): readonly [number, BattleRng];
}

export function createBattleRng(seedInput: string | number): BattleRng {
  return createRngFromState({
    seed: normalizeSeed(seedInput),
    position: 0
  });
}

export function createRngFromState(state: BattleRngState): BattleRng {
  return {
    state,
    next: () => {
      const nextPosition = state.position + 1;
      const value = randomUnit(state.seed, nextPosition);
      return [
        value,
        createRngFromState({
          seed: state.seed,
          position: nextPosition
        })
      ];
    },
    nextInt: (maxExclusive: number) => {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        return [0, createRngFromState(state)];
      }

      const [unit, nextRng] = createRngFromState(state).next();
      return [Math.floor(unit * maxExclusive), nextRng];
    }
  };
}

export function shuffleWithRng<T>(
  values: readonly T[],
  rng: BattleRng
): readonly [readonly T[], BattleRng] {
  const next = [...values];
  let current = rng;

  for (let index = next.length - 1; index > 0; index -= 1) {
    const [swapIndex, nextRng] = current.nextInt(index + 1);
    current = nextRng;
    const value = next[index];
    next[index] = next[swapIndex] as T;
    next[swapIndex] = value as T;
  }

  return [next, current];
}

function normalizeSeed(input: string | number): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input >>> 0;
  }

  const text = String(input);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function randomUnit(seed: number, position: number): number {
  let value = (seed + Math.imul(position, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}
