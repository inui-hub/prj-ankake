import {
  CARD_ATTRIBUTES,
  CARD_TYPES,
  type CardSearchCriteria
} from "@ankake/domain";

export interface CardSearchFilterBarProps {
  readonly criteria: CardSearchCriteria;
  readonly onCriteriaChange: (criteria: CardSearchCriteria) => void;
  readonly onResetCriteria: () => void;
}

export function CardSearchFilterBar({
  criteria,
  onCriteriaChange,
  onResetCriteria
}: CardSearchFilterBarProps) {
  function update(partial: Partial<CardSearchCriteria>): void {
    onCriteriaChange({
      ...criteria,
      ...partial
    });
  }

  return (
    <section className="deck-filter-bar" aria-label="Card filters">
      <label className="deck-field deck-field--search">
        <span>Search</span>
        <input
          value={criteria.query}
          data-testid="card-search-input"
          onChange={(event) => update({ query: event.currentTarget.value })}
        />
      </label>
      <label className="deck-field">
        <span>Type</span>
        <select
          value={criteria.type}
          data-testid="card-type-filter-select"
          onChange={(event) =>
            update({ type: event.currentTarget.value as CardSearchCriteria["type"] })
          }
        >
          <option value="all">All</option>
          {CARD_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="deck-field">
        <span>Attribute</span>
        <select
          value={criteria.attribute}
          data-testid="card-attribute-filter-select"
          onChange={(event) =>
            update({
              attribute: event.currentTarget.value as CardSearchCriteria["attribute"]
            })
          }
        >
          <option value="all">All</option>
          {CARD_ATTRIBUTES.map((attribute) => (
            <option key={attribute} value={attribute}>
              {attribute}
            </option>
          ))}
        </select>
      </label>
      <label className="deck-field">
        <span>Cost</span>
        <select
          value={criteria.cost}
          data-testid="card-cost-filter-select"
          onChange={(event) =>
            update({ cost: event.currentTarget.value as CardSearchCriteria["cost"] })
          }
        >
          <option value="all">All</option>
          <option value="0-2">0-2</option>
          <option value="3-5">3-5</option>
          <option value="6-plus">6+</option>
        </select>
      </label>
      <label className="deck-field">
        <span>Sort</span>
        <select
          value={`${criteria.sortKey}:${criteria.sortDirection}`}
          data-testid="card-sort-select"
          onChange={(event) => {
            const [sortKey, sortDirection] = event.currentTarget.value.split(":");
            update({
              sortKey: sortKey as CardSearchCriteria["sortKey"],
              sortDirection: sortDirection as CardSearchCriteria["sortDirection"]
            });
          }}
        >
          <option value="name:asc">Name</option>
          <option value="cost:asc">Cost up</option>
          <option value="cost:desc">Cost down</option>
          <option value="type:asc">Type</option>
          <option value="attribute:asc">Attribute</option>
        </select>
      </label>
      <button
        type="button"
        className="deck-button deck-button--quiet"
        data-testid="card-filter-reset-button"
        onClick={onResetCriteria}
      >
        Reset
      </button>
    </section>
  );
}
