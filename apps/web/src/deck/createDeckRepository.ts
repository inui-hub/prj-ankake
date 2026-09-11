import type { StaticCatalogSnapshot } from "@ankake/domain";
import { IndexedDbDeckRepository, type DeckRepository } from "@ankake/persistence";

export function createDeckRepository(catalog: StaticCatalogSnapshot): DeckRepository {
  return new IndexedDbDeckRepository({
    catalog
  });
}
