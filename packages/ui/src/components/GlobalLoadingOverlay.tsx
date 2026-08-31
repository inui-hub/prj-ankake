import type { LoadingOverlayViewModel } from "@ankake/domain";
import { localizeLoadingLabel, type UiLocale } from "../localization";

export interface GlobalLoadingOverlayProps {
  readonly overlay: LoadingOverlayViewModel;
  readonly locale?: UiLocale;
}

export function GlobalLoadingOverlay({ overlay, locale }: GlobalLoadingOverlayProps) {
  if (!overlay.visible) {
    return null;
  }

  return (
    <div className="blocking-overlay blocking-overlay--loading" data-testid="global-loading-overlay">
      <div className="loading-panel" role="status" aria-live="polite">
        <span className="loading-panel__spinner" />
        <span>{localizeLoadingLabel(locale, overlay.label)}</span>
      </div>
    </div>
  );
}
