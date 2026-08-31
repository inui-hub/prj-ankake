import { CARD_ATTRIBUTES, CARD_TYPES, type DeckStats } from "@ankake/domain";
import {
  localizeCardAttribute,
  localizeCardType,
  type UiLocale,
  uiText
} from "../../localization";

export interface DeckStatsPanelProps {
  readonly stats: DeckStats;
  readonly locale?: UiLocale;
}

export function DeckStatsPanel({ stats, locale }: DeckStatsPanelProps) {
  return (
    <section className="deck-stats-panel" aria-labelledby="deck-stats-title">
      <h2 id="deck-stats-title">{uiText(locale, "deck.stats")}</h2>
      <div className="deck-stats-grid" data-testid="deck-stats-panel">
        {CARD_TYPES.map((type) => (
          <span key={type}>
            {localizeCardType(locale, type)}: {stats.typeCounts[type]}
          </span>
        ))}
        {CARD_ATTRIBUTES.map((attribute) => (
          <span key={attribute} className={`deck-attribute deck-attribute--${attribute}`}>
            {localizeCardAttribute(locale, attribute)}: {stats.attributeCounts[attribute]}
          </span>
        ))}
        {stats.costBuckets.map((bucket) => (
          <span key={bucket.label}>
            {uiText(locale, "deck.cost")} {bucket.label}: {bucket.count}
          </span>
        ))}
      </div>
    </section>
  );
}
