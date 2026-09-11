import type { MenuActionId, MenuViewModel } from "@ankake/domain";
import { BackgroundScene } from "./BackgroundScene";
import { MenuActionButton } from "./MenuActionButton";
import { localizeMenuText } from "../localization";

export interface MenuScreenProps {
  readonly viewModel: MenuViewModel;
  readonly onActionSelected: (actionId: MenuActionId) => void;
  readonly locale?: "ja" | "en";
  readonly onLocaleChange?: (locale: "ja" | "en") => void;
}

export function MenuScreen({ viewModel, onActionSelected, locale = "ja", onLocaleChange }: MenuScreenProps) {
  return (
    <main className="menu-screen">
      <BackgroundScene />
      <div className="menu-screen__locale" data-testid="menu-language-switcher">
        <button aria-pressed={locale === "ja"} data-testid="menu-language-ja-button" type="button" onClick={() => onLocaleChange?.("ja")}>日本語</button>
        <button aria-pressed={locale === "en"} data-testid="menu-language-en-button" type="button" onClick={() => onLocaleChange?.("en")}>English</button>
      </div>
      <section className="menu-screen__content" aria-labelledby="menu-title">
        <p className="menu-screen__kicker">{locale === "ja" ? "オリジナルDCG" : "Original DCG"}</p>
        <h1 id="menu-title" className="menu-screen__title">
          {localizeMenuText(locale, viewModel.title, "title")}
        </h1>
        <p className="menu-screen__subtitle">{localizeMenuText(locale, viewModel.subtitle, "subtitle")}</p>

        <div className="menu-screen__actions" aria-label="Main menu">
          {viewModel.actions.map((action) => (
            <MenuActionButton key={action.id} action={action} locale={locale} onSelect={onActionSelected} />
          ))}
        </div>

        <p className="menu-screen__version" data-testid="menu-version-text">
          {localizeMenuText(locale, viewModel.versionText, "version")}
        </p>
      </section>
    </main>
  );
}
