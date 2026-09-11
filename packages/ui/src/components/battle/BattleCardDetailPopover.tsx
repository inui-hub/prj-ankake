import type { BattleCardView } from "@ankake/domain";
import { CardArtwork } from "../CardArtwork";
import { uiText } from "../../localization";

export interface BattleCardDetailPopoverProps {
  readonly card: BattleCardView;
  readonly position: { readonly left: number; readonly top: number };
  readonly onPointerEnter: () => void;
  readonly onPointerLeave: () => void;
  readonly locale?: "ja" | "en";
}

/** A deliberately non-interactive detail view; it never takes focus from a card. */
export function BattleCardDetailPopover(props: BattleCardDetailPopoverProps) {
  return (
    <section
      aria-label={`${props.card.name} ${props.locale === "ja" ? "詳細" : "details"}`}
      className="battle-card-detail-popover"
      data-testid="battle-card-detail-popover"
      role="tooltip"
      style={{ left: props.position.left, top: props.position.top }}
      onPointerEnter={props.onPointerEnter}
      onPointerLeave={props.onPointerLeave}
    >
      <CardArtwork attribute={props.card.attribute} catalogCardId={props.card.catalogCardId} className="battle-card-detail-popover__artwork" fallbackClassName="battle-card-detail-popover__artwork" locale={props.locale} name={props.card.name} testIdPrefix="battle-card-detail-artwork" type={props.card.type} />
      <div>
        <h2>{props.card.name}</h2>
        <p>{uiText(props.locale, "battle.attack")} {props.card.currentAttack ?? "-"} / {uiText(props.locale, "battle.health")} {formatHp(props.card)}</p>
        <p>{props.locale === "ja" ? "移動力" : "Movement"} {props.card.movement ?? "-"}</p>
        <p>{props.locale === "ja" ? "効果: " : "Effect: "}{props.card.effectText || (props.locale === "ja" ? "なし" : "None")}</p>
      </div>
    </section>
  );
}

function formatHp(card: BattleCardView): string {
  return card.currentHp === undefined ? "-" : card.maxHp === undefined ? String(card.currentHp) : `${card.currentHp}/${card.maxHp}`;
}
