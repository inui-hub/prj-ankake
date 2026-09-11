import type { BattleCardView } from "@ankake/domain";
import { BattleCard } from "./BattleCard";

export interface BattleHandProps {
  readonly cards: readonly BattleCardView[];
  readonly selectedInstanceId?: string;
  readonly onCardIntent?: (instanceId: string) => void;
  readonly interactionDisabled?: boolean;
  readonly onCardInspect?: (card: BattleCardView, element: HTMLElement, source: "pointer" | "focus" | "touch") => void;
  readonly onInspectLeave?: () => void;
  readonly onInspectBlur?: () => void;
  readonly locale?: "ja" | "en";
}

export function BattleHand(props: BattleHandProps) {
  const ja = props.locale === "ja";
  return (
    <section
      aria-labelledby="battle-hand-title"
      className="battle-hand"
      data-testid="battle-hand"
    >
      <div className="battle-hand__header">
        <h2 id="battle-hand-title">{ja ? "手札" : "Hand"}</h2>
        <span data-testid="battle-player-hand-count">{ja ? `${props.cards.length} 枚` : `${props.cards.length} cards`}</span>
      </div>
      {props.cards.length === 0 ? (
        <p className="battle-hand__empty">{ja ? "手札はありません。" : "No cards in hand."}</p>
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
                locale={props.locale}
                mode="hand"
                isSelected={card.instanceId === props.selectedInstanceId}
                interactionDisabled={props.interactionDisabled}
                onIntent={props.interactionDisabled ? undefined : props.onCardIntent}
                onFocus={(event) => {
                  event.currentTarget.scrollIntoView?.({
                    block: "nearest",
                    inline: "nearest"
                  });
                  props.onCardInspect?.(card, event.currentTarget, "focus");
                }}
                onBlur={props.onInspectBlur}
                onPointerEnter={(event) => props.onCardInspect?.(card, event.currentTarget, "pointer")}
                onPointerLeave={props.onInspectLeave}
                onTouchTap={(event) => props.onCardInspect?.(card, event.currentTarget, "touch")}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
