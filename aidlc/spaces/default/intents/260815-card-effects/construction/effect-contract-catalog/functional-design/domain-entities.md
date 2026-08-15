# Domain Entities — effect-contract-catalog

## Entities

| Entity | Ownership | Attributes | Lifecycle |
| --- | --- | --- | --- |
| CardEffectCatalogEntry | catalog | card ID、version、effect text、ordered definitions または `none` | 仕様入力から構築後は不変 |
| EffectDefinition | catalog | effect ID、trigger、target schema、ordered operations | entry に所属し不変 |
| StaticCatalogSnapshot | catalog | cards、tokens、既存 ID maps、effect lookup、version | validation 成功時に一度だけ生成 |
| StaticCatalogValidationIssue | catalog | code、path、message | build failure 時に収集 |

## Relationships

通常カードまたはトークンは一つの `CardEffectCatalogEntry` に対応する。entry は `none` または一つ以上の `EffectDefinition` を順序付きで持つ。`StaticCatalogSnapshot` は ID から既存 master record と entry を引けるため、後続の効果解決器はカード種別を再解析しない。

## Invariants

- snapshot の effect lookup のキー集合は既存 card/token ID 集合と一致する。
- definition の effect ID は同一 entry 内で重複しない。
- definition の target schema は後続の `EffectSelection` と互換である。
- validation issue が一件でもあれば、snapshot は生成されない。

## Confirmation

この entity 境界は確認済みのカタログ解釈方針に従う。
