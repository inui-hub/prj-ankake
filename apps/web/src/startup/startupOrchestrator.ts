import {
  buildStaticCatalogSnapshot,
  catalogIssuesToFatalError,
  fatalErrorToDiagnosticEvent,
  type AppEvent,
  type DeckSummary,
  type DestinationCapabilityMap,
  unknownStartupErrorToFatalError
} from "@ankake/domain";
import { fetchStaticAssetPayload, type StaticAssetClientOptions } from "./staticAssetClient";

export interface StartupOrchestratorOptions extends StaticAssetClientOptions {
  readonly destinationCapabilities: DestinationCapabilityMap;
  readonly loadDeckSummaries?: () => Promise<readonly DeckSummary[]>;
  readonly recordDiagnostic?: (event: ReturnType<typeof fatalErrorToDiagnosticEvent>) => void;
}

export async function runStartup(options: StartupOrchestratorOptions): Promise<AppEvent> {
  try {
    const payload = await fetchStaticAssetPayload(options);
    const catalog = buildStaticCatalogSnapshot(payload);

    if (!catalog.ok) {
      const error = catalogIssuesToFatalError(catalog.issues);
      options.recordDiagnostic?.(fatalErrorToDiagnosticEvent(error));
      return {
        type: "startup-failed",
        error
      };
    }

    const deckSummaries = await (options.loadDeckSummaries ?? loadEmptyDeckSummaryStub)();

    return {
      type: "startup-succeeded",
      catalog: catalog.snapshot,
      destinationCapabilities: options.destinationCapabilities,
      deckSummaries
    };
  } catch (caughtError) {
    const error = unknownStartupErrorToFatalError(caughtError);
    options.recordDiagnostic?.(fatalErrorToDiagnosticEvent(error));
    return {
      type: "startup-failed",
      error
    };
  }
}

async function loadEmptyDeckSummaryStub(): Promise<readonly DeckSummary[]> {
  return [];
}
