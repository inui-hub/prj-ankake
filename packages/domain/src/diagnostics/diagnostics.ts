import type { FatalErrorState } from "../app-state/types";
import type { StaticCatalogValidationIssue } from "../catalog/types";

export interface DiagnosticEvent {
  readonly level: "error" | "warn" | "info";
  readonly category: "startup" | "catalog" | "navigation";
  readonly message: string;
  readonly details?: readonly string[];
}

export function catalogIssuesToFatalError(issues: readonly StaticCatalogValidationIssue[]): FatalErrorState {
  return {
    title: "Application could not start",
    message: "The local card catalog failed validation. Reload the page after the catalog files are fixed.",
    issues: issues.map((item) => `${item.path}: ${item.message}`),
    canReload: true
  };
}

export function unknownStartupErrorToFatalError(error: unknown): FatalErrorState {
  return {
    title: "Application could not start",
    message: "The local catalog could not be loaded. Reload the page to try again.",
    issues: [readErrorMessage(error)],
    canReload: true
  };
}

export function fatalErrorToDiagnosticEvent(error: FatalErrorState): DiagnosticEvent {
  return {
    level: "error",
    category: "startup",
    message: error.message,
    details: error.issues
  };
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "Unknown startup error.";
}
