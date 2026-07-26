import type { MenuActionId, MenuViewModel } from "@ankake/domain";
import { BackgroundScene } from "./BackgroundScene";
import { MenuActionButton } from "./MenuActionButton";

export interface MenuScreenProps {
  readonly viewModel: MenuViewModel;
  readonly onActionSelected: (actionId: MenuActionId) => void;
}

export function MenuScreen({ viewModel, onActionSelected }: MenuScreenProps) {
  return (
    <main className="menu-screen">
      <BackgroundScene />
      <section className="menu-screen__content" aria-labelledby="menu-title">
        <p className="menu-screen__kicker">Original DCG</p>
        <h1 id="menu-title" className="menu-screen__title">
          {viewModel.title}
        </h1>
        <p className="menu-screen__subtitle">{viewModel.subtitle}</p>

        <div className="menu-screen__actions" aria-label="Main menu">
          {viewModel.actions.map((action) => (
            <MenuActionButton key={action.id} action={action} onSelect={onActionSelected} />
          ))}
        </div>

        <p className="menu-screen__version" data-testid="menu-version-text">
          {viewModel.versionText}
        </p>
      </section>
    </main>
  );
}
