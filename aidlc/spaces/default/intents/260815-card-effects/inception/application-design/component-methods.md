# Component Methods

## Interfaces

```ts
getEffectDefinition(effectId: EffectId): EffectDefinition | undefined
resolveEffect(context: EffectContext, selection: EffectSelection): EffectResolution
getLegalTargets(state: BattleState, source: EffectSource): LegalTargets
enqueue(state: BattleState, trigger: PendingTrigger): BattleState
drain(state: BattleState): EffectResolution
```

## Error Handling

Invalid or stale selections return a typed fizzle/rejection result without partial state changes. Missing catalog definitions fail validation before play.

## Execution Contract

`EffectContext` contains immutable `state`, `source`, `effectId`, `commandId`, `selection`, deterministic `rng`, and an event-sequence counter. `EffectSelection` is validated at command acceptance and again immediately before resolution. `GameEngine.submitCommand` maps `rejected` to no state change, `fizzled` to the documented consumed/not-consumed outcome, and `resolved` to an updated state plus events; partial effects are represented as ordered operations with an explicit failed operation and no silent rollback.

```ts
type EffectSelection = { kind: "none" } | { kind: "creatures"; instanceIds: CreatureInstanceId[] } | { kind: "base"; baseId: BaseId } | { kind: "lane"; lane: Lane } | { kind: "cell"; cell: Cell } | { kind: "graveyard-card"; cardInstanceId: CardInstanceId };
type EffectContext = Readonly<{ state: BattleState; source: EffectSource; effectId: EffectId; commandId: CommandId; selection: EffectSelection; rng: RngState; sequence: number }>;
type EffectResolution = { kind: "resolved"; state: BattleState; events: BattleEvent[]; rng: BattleRngState } | { kind: "fizzled"; state: BattleState; reason: FizzleReason; consumed: boolean; events: BattleEvent[]; rng: BattleRngState };
```
