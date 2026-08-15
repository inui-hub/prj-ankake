# Services

## Domain Service Model

Effect resolution is an in-process domain service invoked by `GameEngine.submitCommand`; no network service or external storage is introduced.

## Lifecycle

Catalog lookup → legal-target validation → atomic resolution → trigger drain → derived-value recalculation → public projection.

## DTO and Queue Schema

`PublicEffectChoice` is `{ effectId, sourceInstanceId, selectionKinds, candidates }`, where every candidate is `{ kind, id, label }`; UI renders only these candidates and CPU receives the identical list. `EffectCommand` is `{ type: "resolveEffect", sourceInstanceId, effectId, selection }` and is mapped directly to `EffectContext` by `GameEngine.submitCommand`.

`PendingTrigger` is `{ triggerEventId, sourceInstanceId, effectId, type, sequence, snapshot, depth }`. It is appended in event sequence order; equal sequences break by source instance ID then effect ID. `depth` is capped at 64 and a `(triggerEventId, sourceInstanceId, effectId)` visited key prevents reentrant duplication. Queue draining ends only when empty or a typed `trigger-loop` rejection is returned.
