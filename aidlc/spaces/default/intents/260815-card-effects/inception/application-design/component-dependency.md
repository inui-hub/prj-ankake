# Component Dependencies

## Dependency Flow

`GameEngine` → `EffectCatalog` → `EffectResolver` → `TriggerQueue` / `ModifierEngine`; `LegalTargetService` is shared by engine projection, UI and CPU.

## Data Ownership

`BattleState` owns card instances, modifiers, pending triggers and effect-use state. The static catalog owns immutable effect definitions.
