export interface DeckLoadingOverlayProps {
  readonly active: boolean;
}

export function DeckLoadingOverlay({ active }: DeckLoadingOverlayProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="blocking-overlay" data-testid="deck-loading-overlay">
      <div className="loading-panel">
        <span className="loading-panel__spinner" aria-hidden="true" />
        <span>Loading deck data</span>
      </div>
    </div>
  );
}
