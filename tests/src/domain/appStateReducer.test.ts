import {
  appStateReducer,
  createInitialAppSnapshot,
  type AppSnapshot,
  type DestinationCapabilityMap,
  type FatalErrorState,
  type MenuActionId
} from "@ankake/domain";
import fc from "fast-check";
import {
  destinationCapabilityMapArbitrary,
  fatalAppSnapshotArbitrary,
  validCatalogSnapshotFixture
} from "../generators/appStateGenerators";

const fatalError: FatalErrorState = {
  title: "Application could not start",
  message: "Startup failed.",
  issues: ["generated issue"],
  canReload: true
};

const disabledCapabilities: DestinationCapabilityMap = {
  "cpu-battle": {
    actionId: "cpu-battle",
    routeId: "battle-preparation",
    label: "CPU Battle",
    enabled: false,
    disabledReason: "later"
  },
  "deck-building": {
    actionId: "deck-building",
    routeId: "deck-building",
    label: "Deck Building",
    enabled: false,
    disabledReason: "later"
  }
};

describe("app state reducer", () => {
  it("transitions from initializing to ready after successful startup", () => {
    const result = appStateReducer(createInitialAppSnapshot(), {
      type: "startup-succeeded",
      catalog: validCatalogSnapshotFixture,
      destinationCapabilities: disabledCapabilities,
      deckSummaries: []
    });

    expect(result.kind).toBe("ready");
    expect(result.currentRoute).toBe("menu");
  });

  it("transitions from initializing to fatal-error after startup failure", () => {
    const result = appStateReducer(createInitialAppSnapshot(), {
      type: "startup-failed",
      error: fatalError
    });

    expect(result.kind).toBe("fatal-error");
    if (result.kind === "fatal-error") {
      expect(result.error.canReload).toBe(true);
    }
  });

  it("ignores disabled menu action requests", () => {
    const ready: AppSnapshot = {
      kind: "ready",
      currentRoute: "menu",
      catalog: validCatalogSnapshotFixture,
      destinationCapabilities: disabledCapabilities,
      deckSummaries: []
    };

    expect(appStateReducer(ready, { type: "menu-action-requested", actionId: "cpu-battle" })).toBe(ready);
  });

  it("never navigates away from fatal-error state for menu actions", () => {
    fc.assert(
      fc.property(fatalAppSnapshotArbitrary, fc.constantFrom<MenuActionId>("cpu-battle", "deck-building"), (snapshot, actionId) => {
        const result = appStateReducer(snapshot, {
          type: "menu-action-requested",
          actionId
        });

        expect(result).toBe(snapshot);
      }),
      { numRuns: 40 }
    );
  });

  it("rejects repeated menu actions while navigation is pending", () => {
    fc.assert(
      fc.property(destinationCapabilityMapArbitrary, fc.constantFrom<MenuActionId>("cpu-battle", "deck-building"), (destinationCapabilities, actionId) => {
        const pending: AppSnapshot = {
          kind: "navigation-pending",
          currentRoute: "menu",
          targetRoute: "battle-preparation",
          catalog: validCatalogSnapshotFixture,
          destinationCapabilities,
          deckSummaries: []
        };

        expect(appStateReducer(pending, { type: "menu-action-requested", actionId })).toBe(pending);
      }),
      { numRuns: 40 }
    );
  });
});
