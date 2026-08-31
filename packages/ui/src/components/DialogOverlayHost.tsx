import type { MenuViewModel } from "@ankake/domain";
import { FatalErrorDialog } from "./FatalErrorDialog";
import { GlobalLoadingOverlay } from "./GlobalLoadingOverlay";

export interface DialogOverlayHostProps {
  readonly viewModel: MenuViewModel;
  readonly onReloadRequested: () => void;
  readonly locale?: "ja" | "en";
}

export function DialogOverlayHost({ viewModel, onReloadRequested, locale }: DialogOverlayHostProps) {
  return (
    <>
      <GlobalLoadingOverlay overlay={viewModel.loadingOverlay} locale={locale} />
      {viewModel.fatalErrorDialog ? (
        <FatalErrorDialog error={viewModel.fatalErrorDialog} locale={locale} onReloadRequested={onReloadRequested} />
      ) : null}
    </>
  );
}
