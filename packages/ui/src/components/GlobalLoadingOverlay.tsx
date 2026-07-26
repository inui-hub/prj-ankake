import type { LoadingOverlayViewModel } from "@ankake/domain";

export interface GlobalLoadingOverlayProps {
  readonly overlay: LoadingOverlayViewModel;
}

export function GlobalLoadingOverlay({ overlay }: GlobalLoadingOverlayProps) {
  if (!overlay.visible) {
    return null;
  }

  return (
    <div className="blocking-overlay blocking-overlay--loading" data-testid="global-loading-overlay">
      <div className="loading-panel" role="status" aria-live="polite">
        <span className="loading-panel__spinner" />
        <span>{overlay.label}</span>
      </div>
    </div>
  );
}
