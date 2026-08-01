import { useEffect, useState } from "react";

const cardArtworkUrls = import.meta.glob<string>(
  "../../../../images/card_illustrations/*.png",
  {
    eager: true,
    query: "?url",
    import: "default"
  }
);

export interface CardArtworkProps {
  readonly catalogCardId: string;
  readonly name: string;
  readonly type: string;
  readonly attribute: string;
  readonly illustration?: string;
  readonly className?: string;
  readonly fallbackClassName?: string;
  readonly testIdPrefix?: string;
}

export function CardArtwork(props: CardArtworkProps) {
  const [failed, setFailed] = useState(false);
  const source = resolveCardArtworkSrc(props.catalogCardId, props.illustration);
  const testIdPrefix = props.testIdPrefix ?? "card-artwork";

  useEffect(() => {
    setFailed(false);
  }, [props.catalogCardId, props.illustration]);

  if (failed || !source) {
    return (
      <div
        aria-label={`${props.name} artwork unavailable`}
        className={joinClassNames(props.className, props.fallbackClassName)}
        data-testid={`${testIdPrefix}-fallback-${props.catalogCardId}`}
        role="img"
      >
        <strong>{props.name}</strong>
        <span>{props.type}</span>
        <span>{props.attribute}</span>
      </div>
    );
  }

  return (
    <img
      alt={props.name}
      className={props.className}
      data-testid={`${testIdPrefix}-${props.catalogCardId}`}
      draggable={false}
      loading="lazy"
      src={source}
      onError={() => setFailed(true)}
    />
  );
}

export function resolveCardArtworkSrc(
  catalogCardId: string,
  illustration?: string
): string | undefined {
  const fileName =
    illustration?.split("/").at(-1) ??
    `project_ankake_card_illustration_${catalogCardId}_v1_0.png`;

  return cardArtworkUrls[
    `../../../../images/card_illustrations/${fileName}`
  ];
}

function joinClassNames(
  ...classNames: readonly (string | undefined)[]
): string | undefined {
  const value = classNames.filter(Boolean).join(" ");
  return value || undefined;
}
