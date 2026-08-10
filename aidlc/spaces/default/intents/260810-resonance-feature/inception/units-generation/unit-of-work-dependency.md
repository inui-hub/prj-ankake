# 依存関係
確認済みの依存順序。
## Flow
`resonance-domain` → `resonance-integration` → `resonance-ui` → `resonance-tests`。

```yaml
units:
  - name: resonance-domain
    kind: library
    depends_on: []
  - name: resonance-integration
    kind: service
    depends_on: [resonance-domain]
  - name: resonance-ui
    kind: ui
    depends_on: [resonance-integration]
  - name: resonance-tests
    kind: spec
    depends_on: [resonance-ui]
```
