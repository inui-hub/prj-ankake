import type { MenuActionViewModel } from "@ankake/domain";

export interface MenuActionButtonProps {
  readonly action: MenuActionViewModel;
  readonly onSelect: (actionId: MenuActionViewModel["id"]) => void;
}

export function MenuActionButton({ action, onSelect }: MenuActionButtonProps) {
  return (
    <button
      type="button"
      className={`menu-action menu-action--${action.tone}`}
      data-testid={action.dataTestId}
      disabled={!action.enabled}
      aria-disabled={!action.enabled}
      onClick={() => onSelect(action.id)}
    >
      <span className="menu-action__label">{action.label}</span>
      <span className="menu-action__description">{action.description}</span>
      {!action.enabled && action.disabledReason ? (
        <span className="menu-action__disabled">{action.disabledReason}</span>
      ) : null}
    </button>
  );
}
