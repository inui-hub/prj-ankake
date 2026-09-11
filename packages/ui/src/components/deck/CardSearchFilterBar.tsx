import {
  CARD_ATTRIBUTES,
  CARD_TYPES,
  type CardSearchCriteria
} from "@ankake/domain";
import { localizeCardAttribute, localizeCardType, uiText } from "../../localization";

export interface CardSearchFilterBarProps {
  readonly criteria: CardSearchCriteria;
  readonly onCriteriaChange: (criteria: CardSearchCriteria) => void;
  readonly onResetCriteria: () => void;
  readonly locale?: "ja" | "en";
}

export function CardSearchFilterBar({
  criteria,
  onCriteriaChange,
  onResetCriteria,
  locale = "ja"
}: CardSearchFilterBarProps) {
  function update(partial: Partial<CardSearchCriteria>): void {
    onCriteriaChange({
      ...criteria,
      ...partial
    });
  }

  return (
    <section className="deck-filter-bar" aria-label={uiText(locale, "deck.cards")}>
      <label className="deck-field deck-field--search">
        <span>{uiText(locale, "deck.search")}</span>
        <input
          value={criteria.query}
          data-testid="card-search-input"
          onChange={(event) => update({ query: event.currentTarget.value })}
        />
      </label>
      <label className="deck-field">
        <span>{uiText(locale, "deck.type")}</span>
        <select
          value={criteria.type}
          data-testid="card-type-filter-select"
          onChange={(event) =>
            update({ type: event.currentTarget.value as CardSearchCriteria["type"] })
          }
        >
          <option value="all">{uiText(locale, "deck.all")}</option>
          {CARD_TYPES.map((type) => (
            <option key={type} value={type}>
              {localizeCardType(locale, type)}
            </option>
          ))}
        </select>
      </label>
      <label className="deck-field">
        <span>{uiText(locale, "deck.attribute")}</span>
        <select
          value={criteria.attribute}
          data-testid="card-attribute-filter-select"
          onChange={(event) =>
            update({
              attribute: event.currentTarget.value as CardSearchCriteria["attribute"]
            })
          }
        >
          <option value="all">{uiText(locale, "deck.all")}</option>
          {CARD_ATTRIBUTES.map((attribute) => (
            <option key={attribute} value={attribute}>
              {localizeCardAttribute(locale, attribute)}
            </option>
          ))}
        </select>
      </label>
      <label className="deck-field">
        <span>{uiText(locale, "deck.cost")}</span>
        <select
          value={criteria.cost}
          data-testid="card-cost-filter-select"
          onChange={(event) =>
            update({ cost: event.currentTarget.value as CardSearchCriteria["cost"] })
          }
        >
          <option value="all">{uiText(locale, "deck.all")}</option>
          <option value="0-2">0-2</option>
          <option value="3-5">3-5</option>
          <option value="6-plus">6+</option>
        </select>
      </label>
      <label className="deck-field">
        <span>{uiText(locale, "deck.sort")}</span>
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
          <option value="name:asc">{uiText(locale, "deck.sort.name")}</option>
          <option value="cost:asc">{uiText(locale, "deck.sort.cost-asc")}</option>
          <option value="cost:desc">{uiText(locale, "deck.sort.cost-desc")}</option>
          <option value="type:asc">{uiText(locale, "deck.sort.type")}</option>
          <option value="attribute:asc">{uiText(locale, "deck.sort.attribute")}</option>
        </select>
      </label>
      <button
        type="button"
        className="deck-button deck-button--quiet"
        data-testid="card-filter-reset-button"
        onClick={onResetCriteria}
      >
        {uiText(locale, "deck.reset")}
      </button>
    </section>
  );
}
