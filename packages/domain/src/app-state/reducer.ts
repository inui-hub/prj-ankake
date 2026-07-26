import type { AppEvent, AppSnapshot } from "./types";

export function createInitialAppSnapshot(): AppSnapshot {
  return {
    kind: "initializing",
    currentRoute: "menu"
  };
}

export function appStateReducer(state: AppSnapshot, event: AppEvent): AppSnapshot {
  switch (event.type) {
    case "startup-succeeded":
      if (state.kind !== "initializing") {
        return state;
      }

      return {
        kind: "ready",
        currentRoute: "menu",
        catalog: event.catalog,
        destinationCapabilities: event.destinationCapabilities,
        deckSummaries: event.deckSummaries
      };

    case "startup-failed":
      if (state.kind === "fatal-error") {
        return state;
      }

      return {
        kind: "fatal-error",
        currentRoute: "menu",
        error: event.error
      };

    case "menu-action-requested":
      if (state.kind !== "ready") {
        return state;
      }

      return requestNavigation(state, event.actionId);

    case "transition-succeeded":
      if (state.kind !== "navigation-pending" || state.targetRoute !== event.routeId) {
        return state;
      }

      return {
        kind: "ready",
        currentRoute: event.routeId,
        catalog: state.catalog,
        destinationCapabilities: state.destinationCapabilities,
        deckSummaries: state.deckSummaries
      };

    case "route-selected":
      if (state.kind !== "ready") {
        return state;
      }

      return {
        ...state,
        currentRoute: event.routeId
      };

    case "transition-failed":
      return {
        kind: "fatal-error",
        currentRoute: "menu",
        error: event.error
      };

    default:
      return state;
  }
}

function requestNavigation(
  state: Extract<AppSnapshot, { kind: "ready" }>,
  actionId: keyof Extract<AppSnapshot, { kind: "ready" }>["destinationCapabilities"]
): AppSnapshot {
  const capability = state.destinationCapabilities[actionId];

  if (!capability?.enabled) {
    return state;
  }

  return {
    kind: "navigation-pending",
    currentRoute: state.currentRoute,
    targetRoute: capability.routeId,
    catalog: state.catalog,
    destinationCapabilities: state.destinationCapabilities,
    deckSummaries: state.deckSummaries
  };
}
