import { CARD_ATTRIBUTES, CARD_TYPES, type DeckStats } from "@ankake/domain";

export interface DeckStatsPanelProps {
  readonly stats: DeckStats;
}

export function DeckStatsPanel({ stats }: DeckStatsPanelProps) {
  return (
    <section className="deck-stats-panel" aria-labelledby="deck-stats-title">
      <h2 id="deck-stats-title">Stats</h2>
      <div className="deck-stats-grid" data-testid="deck-stats-panel">
        {CARD_TYPES.map((type) => (
          <span key={type}>
            {type}: {stats.typeCounts[type]}
          </span>
        ))}
        {CARD_ATTRIBUTES.map((attribute) => (
          <span key={attribute} className={`deck-attribute deck-attribute--${attribute}`}>
            {attribute}: {stats.attributeCounts[attribute]}
          </span>
        ))}
        {stats.costBuckets.map((bucket) => (
          <span key={bucket.label}>
            cost {bucket.label}: {bucket.count}
          </span>
        ))}
      </div>
    </section>
  );
}
