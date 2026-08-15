## 実施記録（下書き）

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: card-effects
fingerprint: unknown
analyzed:
  paths:
    - packages/domain/src/battle/
    - packages/domain/src/catalog/
    - packages/cpu/src/
    - apps/web/src/battle/
    - packages/ui/src/components/battle/
    - tests/src/domain/
    - tests/src/app/
    - tests/src/ui/battleScreen.test.tsx
    - apps/web/public/data/cards.json
    - apps/web/public/data/tokens.json
    - docs/project_ankake_basic_rules_requirements_spec_v1_1.md
    - docs/project_ankake_card_detailed_requirements_spec_v1_1.md
    - package.json
    - packages/domain/package.json
    - packages/cpu/package.json
    - packages/ui/package.json
    - apps/web/package.json
    - tests/package.json
    - tsconfig.base.json
    - tests/vitest.config.ts
  components:
    - Battle Domain
    - Card Effect Catalog
    - Battle Application Runtime
    - Battle Presentation
    - CPU Strategy
    - Test Suite
shallow:
  paths:
    - packages/domain/src/deck/
    - packages/persistence/
    - apps/web/src/deck/
    - packages/ui/src/components/deck/
    - docs/images/
    - images/
```
