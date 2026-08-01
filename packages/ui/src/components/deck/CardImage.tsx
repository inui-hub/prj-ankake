import type { CardMasterRecord } from "@ankake/domain";
import { CardArtwork } from "../CardArtwork";

export interface CardImageProps {
  readonly card: CardMasterRecord;
  readonly className?: string;
}

export function CardImage({ card, className }: CardImageProps) {
  return (
    <CardArtwork
      attribute={card.attribute}
      catalogCardId={card.id}
      className={["deck-card-image", className].filter(Boolean).join(" ")}
      fallbackClassName="deck-card-image--fallback"
      illustration={card.illustration}
      name={card.name}
      testIdPrefix="deck-card-image"
      type={card.type}
    />
  );
}
