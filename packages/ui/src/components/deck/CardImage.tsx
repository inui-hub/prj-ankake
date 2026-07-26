import type { CardMasterRecord } from "@ankake/domain";
import { useState } from "react";

const cardImageUrls = import.meta.glob<string>(
  "../../../../../images/card_illustrations/*.png",
  {
    eager: true,
    query: "?url",
    import: "default"
  }
);

export interface CardImageProps {
  readonly card: CardMasterRecord;
  readonly className?: string;
}

export function CardImage({ card, className }: CardImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`deck-card-image deck-card-image--fallback ${className ?? ""}`}
        data-testid={`deck-card-image-fallback-${card.id}`}
      >
        <span>{card.name}</span>
      </div>
    );
  }

  return (
    <img
      className={`deck-card-image ${className ?? ""}`}
      src={resolveCardImageSrc(card)}
      alt={card.name}
      loading="lazy"
      draggable={false}
      data-testid={`deck-card-image-${card.id}`}
      onError={() => setFailed(true)}
    />
  );
}

function resolveCardImageSrc(card: CardMasterRecord): string {
  const fileName = card.illustration.split("/").at(-1);
  return fileName
    ? cardImageUrls[`../../../../../images/card_illustrations/${fileName}`] ?? card.illustration
    : card.illustration;
}
