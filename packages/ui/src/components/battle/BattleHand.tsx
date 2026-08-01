import type { BattleCardView } from "@ankake/domain";
import { BattleCard } from "./BattleCard";

export interface BattleHandProps {
  readonly cards: readonly BattleCardView[];
  readonly onCardIntent?: (instanceId: string) => void;
}

export function BattleHand(props: BattleHandProps) {
  return (
    <section
      aria-labelledby="battle-hand-title"
      className="battle-hand"
      data-testid="battle-hand"
    >
      <div className="battle-hand__header">
        <h2 id="battle-hand-title">Hand</h2>
        <span data-testid="battle-player-hand-count">{props.cards.length} cards</span>
      </div>
      {props.cards.length === 0 ? (
        <p className="battle-hand__empty">No cards in hand.</p>
      ) : (
        <div
          className="battle-hand__scroller"
          data-testid="battle-hand-scroller"
          role="list"
        >
          {props.cards.map((card) => (
            <div
              className="battle-hand__item"
              key={card.instanceId}
              role="listitem"
            >
              <BattleCard
                card={card}
                mode="hand"
                onIntent={props.onCardIntent}
                onFocus={(event) => {
                  event.currentTarget.scrollIntoView?.({
                    block: "nearest",
                    inline: "nearest"
                  });
                }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
