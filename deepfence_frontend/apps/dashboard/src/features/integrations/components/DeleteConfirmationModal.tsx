import { FetcherWithComponents } from 'react-router-dom';
import { Button, Modal } from 'ui-components';

import { ModelExportReport } from '@/api/generated';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ActionData, ActionEnumType } from '@/features/integrations/pages/DownloadReport';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';

export const DeleteConfirmationModal = ({
  showDialog,
  row,
  setShowDialog,
  fetcher,
  onTableAction,
}: {
  showDialog: boolean;
  row: ModelExportReport | undefined;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  fetcher: FetcherWithComponents<ActionData>;
  onTableAction: (row: ModelExportReport, actionType: ActionEnumType) => void;
}) => {
  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center dark:text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete report
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="sm"
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="error"
              onClick={(e) => {
                e.preventDefault();
                onTableAction(row!, ActionEnumType.CONFIRM_DELETE);
              }}
            >
              Yes, I&apos;m sure
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>The selected report will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message ? (
            <p className="text-red-500 text-sm pb-4">{fetcher.data?.message}</p>
          ) : null}
          <div className="flex items-center justify-right gap-4"></div>
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};
