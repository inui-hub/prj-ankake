import type { VersionMetadata } from "@ankake/domain";

export interface StaticAssetPayload {
  readonly cards: unknown;
  readonly tokens: unknown;
  readonly version: VersionMetadata;
}

export interface StaticAssetClientOptions {
  readonly fetcher?: typeof fetch;
}

const CARD_CATALOG_URL = "/data/cards.json";
const TOKEN_CATALOG_URL = "/data/tokens.json";
const VERSION_URL = "/data/version.json";

export async function fetchStaticAssetPayload(options: StaticAssetClientOptions = {}): Promise<StaticAssetPayload> {
  const fetcher = options.fetcher ?? globalThis.fetch;
  const [cards, tokens, version] = await Promise.all([
    fetchJson(CARD_CATALOG_URL, fetcher),
    fetchJson(TOKEN_CATALOG_URL, fetcher),
    fetchJson(VERSION_URL, fetcher)
  ]);

  if (!isVersionMetadata(version)) {
    throw new Error("Version metadata is invalid.");
  }

  return {
    cards,
    tokens,
    version
  };
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

function isVersionMetadata(value: unknown): value is VersionMetadata {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.schemaVersion === "string" &&
    typeof record.catalogVersion === "string" &&
    typeof record.appVersion === "string" &&
    typeof record.generatedAt === "string" &&
    Array.isArray(record.sourceDocuments) &&
    record.sourceDocuments.every((item) => typeof item === "string")
  );
}
