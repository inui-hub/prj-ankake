import {
  projectMenuViewModel,
  type AppSnapshot,
  type DestinationCapabilityMap
} from "@ankake/domain";
import fc from "fast-check";
import {
  anyMenuVisibleAppSnapshotArbitrary,
  destinationCapabilityMapArbitrary,
  nonReadyAppSnapshotArbitrary,
  validCatalogSnapshotFixture
} from "../generators/appStateGenerators";

const configuredCapabilities: DestinationCapabilityMap = {
  "cpu-battle": {
    actionId: "cpu-battle",
    routeId: "battle-preparation",
    label: "CPU Battle",
    enabled: false,
    disabledReason: "Coming in UOW-003."
  },
  "deck-building": {
    actionId: "deck-building",
    routeId: "deck-building",
    label: "Deck Building",
    enabled: false,
    disabledReason: "Coming in UOW-002."
  }
};

describe("menu projection", () => {
  it("projects disabled future destination actions in UOW-001", () => {
    const ready: AppSnapshot = {
      kind: "ready",
      currentRoute: "menu",
      catalog: validCatalogSnapshotFixture,
      destinationCapabilities: configuredCapabilities,
      deckSummaries: []
    };

    const viewModel = projectMenuViewModel(ready, configuredCapabilities);

    expect(viewModel.actions).toHaveLength(2);
    expect(viewModel.actions.map((action) => action.id)).toEqual(["cpu-battle", "deck-building"]);
    expect(viewModel.actions.every((action) => action.enabled === false)).toBe(true);
  });

  it("projects all actions as disabled while the app is not ready", () => {
    fc.assert(
      fc.property(nonReadyAppSnapshotArbitrary, (snapshot) => {
        const viewModel = projectMenuViewModel(snapshot, configuredCapabilities);
        expect(viewModel.actions.every((action) => action.enabled === false)).toBe(true);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps disabled capabilities disabled for every visible menu projection", () => {
    fc.assert(
      fc.property(anyMenuVisibleAppSnapshotArbitrary, destinationCapabilityMapArbitrary, (snapshot, capabilities) => {
        const forcedDisabled: DestinationCapabilityMap = {
          "cpu-battle": {
            ...capabilities["cpu-battle"],
            enabled: false,
            disabledReason: "generated disabled"
          },
          "deck-building": {
            ...capabilities["deck-building"],
            enabled: false,
            disabledReason: "generated disabled"
          }
        };
        const projectedSnapshot =
          snapshot.kind === "ready"
            ? {
                ...snapshot,
                destinationCapabilities: forcedDisabled
              }
            : snapshot;

        const viewModel = projectMenuViewModel(projectedSnapshot, forcedDisabled);
        expect(viewModel.actions.every((action) => action.enabled === false)).toBe(true);
      }),
      { numRuns: 40 }
    );
  });
});
