import ruinedBattlefieldBackground from "../../../../images/backgrounds/project_ankake_ruined_battlefield_background_v1_0.png";

export function BackgroundScene() {
  return (
    <div className="background-scene" aria-hidden="true" data-testid="shared-background-scene">
      <img className="background-scene__image" src={ruinedBattlefieldBackground} alt="" draggable={false} />
    </div>
  );
}
