import type { CardMasterRecord } from "@ankake/domain";
import { CardArtwork } from "../CardArtwork";
import type { UiLocale } from "../../localization";

export interface CardImageProps {
  readonly card: CardMasterRecord;
  readonly className?: string;
  readonly name?: string;
  readonly type?: string;
  readonly attribute?: string;
  readonly locale?: UiLocale;
}

export function CardImage({ card, className, name = card.name, type = card.type, attribute = card.attribute, locale }: CardImageProps) {
  return (
    <CardArtwork
      attribute={attribute}
      catalogCardId={card.id}
      className={["deck-card-image", className].filter(Boolean).join(" ")}
      fallbackClassName="deck-card-image--fallback"
      illustration={card.illustration}
      locale={locale}
      name={name}
      testIdPrefix="deck-card-image"
      type={type}
    />
  );
}
