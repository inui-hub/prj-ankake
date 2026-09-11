const featuredCards = [
  new URL("../../../../images/card_illustrations/project_ankake_card_illustration_AK-010_v1_0.png", import.meta.url).href,
  new URL("../../../../images/card_illustrations/project_ankake_card_illustration_AK-024_v1_0.png", import.meta.url).href,
  new URL("../../../../images/card_illustrations/project_ankake_card_illustration_AK-048_v1_0.png", import.meta.url).href
];

export function BackgroundScene() {
  return (
    <div className="background-scene" aria-hidden="true">
      <div className="background-scene__mat" />
      <div className="background-scene__cards">
        {featuredCards.map((src, index) => (
          <img
            key={src}
            className={`background-scene__card background-scene__card--${index + 1}`}
            src={src}
            alt=""
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
