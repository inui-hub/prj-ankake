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
  const maximumCostBucketCount = Math.max(
    0,
    ...stats.costBuckets.map((bucket) => bucket.count)
  );

  return (
    <section className="deck-stats-panel" aria-labelledby="deck-stats-title" data-testid="deck-stats-section">
      <h2 id="deck-stats-title">{uiText(locale, "deck.stats")}</h2>
      <div className="deck-stats-layout">
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
        </div>
        <div
          className="deck-cost-chart"
          data-testid="deck-cost-chart"
          role="img"
          aria-label={stats.costBuckets
            .map((bucket) => `${uiText(locale, "deck.cost")} ${bucket.label}: ${bucket.count}`)
            .join(", ")}
        >
          {stats.costBuckets.map((bucket) => (
            <div className="deck-cost-chart__bucket" key={bucket.label}>
              <span className="deck-cost-chart__count">{bucket.count}</span>
              <div className="deck-cost-chart__track">
                <div
                  className="deck-cost-chart__bar"
                  data-testid={`deck-cost-chart-bar-${bucket.label}`}
                  style={{
                    height: `${maximumCostBucketCount === 0 ? 0 : (bucket.count / maximumCostBucketCount) * 100}%`
                  }}
                />
              </div>
              <span className="deck-cost-chart__label">{bucket.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
