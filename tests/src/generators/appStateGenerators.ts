import {
  createInitialAppSnapshot,
  type AppSnapshot,
  type DestinationCapability,
  type DestinationCapabilityMap,
  type FatalErrorState,
  type MenuActionId,
  type RouteId
} from "@ankake/domain";
import fc from "fast-check";
import { validCatalogSnapshotFixture } from "./catalogGenerators";

export { validCatalogSnapshotFixture } from "./catalogGenerators";

const MENU_ACTION_IDS = ["cpu-battle", "deck-building"] as const satisfies readonly MenuActionId[];
const ROUTE_IDS = ["deck-building", "battle-preparation"] as const satisfies readonly RouteId[];

export const fatalErrorStateArbitrary: fc.Arbitrary<FatalErrorState> = fc
  .array(fc.string({ minLength: 1, maxLength: 48 }), { minLength: 1, maxLength: 4 })
  .map((issues) => ({
    title: "Application could not start",
    message: "Generated fatal startup error.",
    issues,
    canReload: true
  }));

export const destinationCapabilityArbitrary = (
  actionId: MenuActionId,
  routeId: RouteId
): fc.Arbitrary<DestinationCapability> =>
  fc.boolean().map((enabled) => ({
    actionId,
    routeId,
    label: actionId === "cpu-battle" ? "CPU Battle" : "Deck Building",
    enabled,
    disabledReason: enabled ? undefined : "Generated disabled destination."
  }));

export const destinationCapabilityMapArbitrary: fc.Arbitrary<DestinationCapabilityMap> = fc
  .tuple(destinationCapabilityArbitrary(MENU_ACTION_IDS[0], ROUTE_IDS[1]), destinationCapabilityArbitrary(MENU_ACTION_IDS[1], ROUTE_IDS[0]))
  .map(([cpuBattle, deckBuilding]) => ({
    "cpu-battle": cpuBattle,
    "deck-building": deckBuilding
  }));

export const readyAppSnapshotArbitrary: fc.Arbitrary<AppSnapshot> = destinationCapabilityMapArbitrary.map((destinationCapabilities) => ({
  kind: "ready",
  currentRoute: "menu",
  catalog: validCatalogSnapshotFixture,
  destinationCapabilities,
  deckSummaries: []
}));

export const fatalAppSnapshotArbitrary: fc.Arbitrary<AppSnapshot> = fatalErrorStateArbitrary.map((error) => ({
  kind: "fatal-error",
  currentRoute: "menu",
  error
}));

export const nonReadyAppSnapshotArbitrary: fc.Arbitrary<AppSnapshot> = fc.oneof(
  fc.constant(createInitialAppSnapshot()),
  fatalAppSnapshotArbitrary
);

export const anyMenuVisibleAppSnapshotArbitrary: fc.Arbitrary<AppSnapshot> = fc.oneof(
  nonReadyAppSnapshotArbitrary,
  readyAppSnapshotArbitrary
);
