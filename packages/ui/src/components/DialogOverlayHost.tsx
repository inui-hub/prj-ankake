import type { MenuViewModel } from "@ankake/domain";
import { FatalErrorDialog } from "./FatalErrorDialog";
import { GlobalLoadingOverlay } from "./GlobalLoadingOverlay";

export interface DialogOverlayHostProps {
  readonly viewModel: MenuViewModel;
  readonly onReloadRequested: () => void;
}

export function DialogOverlayHost({ viewModel, onReloadRequested }: DialogOverlayHostProps) {
  return (
    <>
      <GlobalLoadingOverlay overlay={viewModel.loadingOverlay} />
      {viewModel.fatalErrorDialog ? (
        <FatalErrorDialog error={viewModel.fatalErrorDialog} onReloadRequested={onReloadRequested} />
      ) : null}
    </>
  );
}
