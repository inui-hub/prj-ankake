import {
  buildStaticCatalogSnapshot,
  CANONICAL_EFFECT_MANIFEST,
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
    // The shipped JSON still owns card art/stats, while the canonical manifest
    // owns rules text and ordered effect IDs.  Materialize those authoritative
    // fields before validation so placeholder asset text can never disable the
    // effect registry at startup.
    const catalog = buildStaticCatalogSnapshot({
      ...withCanonicalEffects(payload),
      effectManifest: CANONICAL_EFFECT_MANIFEST
    });

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

function withCanonicalEffects(payload: Awaited<ReturnType<typeof fetchStaticAssetPayload>>) {
  const entries = new Map(CANONICAL_EFFECT_MANIFEST.map((entry) => [entry.cardId, entry]));
  const apply = (records: unknown): unknown => Array.isArray(records) ? records.map((record) => {
    if (typeof record !== "object" || record === null || Array.isArray(record)) return record;
    const entry = entries.get((record as { id?: unknown }).id as string);
    if (!entry) return record;
    return {
      ...record,
      effectText: entry.effects === "none" ? "なし" : entry.effects[0]!.operations[0]!.text,
      effectIds: entry.effects === "none" ? [] : entry.effects.map((effect) => effect.effectId)
    };
  }) : records;
  return { ...payload, cards: apply(payload.cards), tokens: apply(payload.tokens) };
}

async function loadEmptyDeckSummaryStub(): Promise<readonly DeckSummary[]> {
  return [];
}
