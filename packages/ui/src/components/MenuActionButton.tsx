import type { MenuActionViewModel } from "@ankake/domain";
import { localizeMenuText, type UiLocale } from "../localization";

export interface MenuActionButtonProps {
  readonly action: MenuActionViewModel;
  readonly onSelect: (actionId: MenuActionViewModel["id"]) => void;
  readonly locale?: UiLocale;
}

export function MenuActionButton({ action, locale, onSelect }: MenuActionButtonProps) {
  return (
    <button
      type="button"
      className={`menu-action menu-action--${action.tone}`}
      data-testid={action.dataTestId}
      disabled={!action.enabled}
      aria-disabled={!action.enabled}
      onClick={() => onSelect(action.id)}
    >
      <span className="menu-action__label">{localizeMenuText(locale, action.label, "action")}</span>
      <span className="menu-action__description">{localizeMenuText(locale, action.description, "description")}</span>
      {!action.enabled && action.disabledReason ? (
        <span className="menu-action__disabled">{localizeMenuText(locale, action.disabledReason, "reason")}</span>
      ) : null}
    </button>
  );
}
