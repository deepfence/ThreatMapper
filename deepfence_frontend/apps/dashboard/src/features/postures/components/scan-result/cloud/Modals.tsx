import { useCallback, useEffect, useState } from 'react';
import { useFetcher } from 'react-router-dom';
import { Button, Checkbox, Modal } from 'ui-components';

import { BellLineIcon } from '@/components/icons/common/BellLine';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SelectNotificationChannel } from '@/features/integrations/components/SelectNotificationChannel';
import {
  ActionData,
  ActionEnumType,
} from '@/features/postures/components/scan-result/cloud/action';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';

export const DeleteConfirmationModal = ({
  showDialog,
  ids,
  setShowDialog,
  onDeleteSuccess,
}: {
  showDialog: boolean;
  ids: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onDeleteSuccess: () => void;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      ids.forEach((item) => formData.append('nodeIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids, fetcher],
  );

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.success &&
      fetcher.data.action === ActionEnumType.DELETE
    ) {
      onDeleteSuccess();
    }
  }, [fetcher]);

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete posture
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="md"
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              color="error"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction(ActionEnumType.DELETE);
              }}
            >
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>The selected posture will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
          <div className="flex items-center justify-right gap-4"></div>
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

export const DeleteScanConfirmationModal = ({
  open,
  onOpenChange,
  scanId,
}: {
  scanId: string;
  open: boolean;
  onOpenChange: (open: boolean, deleteSuccessful: boolean) => void;
}) => {
  const [deleteSuccessful, setDeleteSuccessful] = useState(false);
  const fetcher = useFetcher<ActionData>();
  const onDeleteScan = () => {
    const formData = new FormData();
    formData.append('actionType', ActionEnumType.DELETE_SCAN);
    formData.append('scanId', scanId);
    fetcher.submit(formData, {
      method: 'post',
    });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      setDeleteSuccessful(true);
    }
  }, [fetcher]);
  return (
    <Modal
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open, deleteSuccessful);
      }}
      size="s"
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete scan
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="md"
              onClick={() => onOpenChange(false, deleteSuccessful)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              color="error"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                onDeleteScan();
              }}
            >
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>
            Are you sure you want to delete this scan? This action cannot be undone.
          </span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

export const NotifyModal = ({
  open,
  ids,
  closeModal,
}: {
  open: boolean;
  ids: string[];
  closeModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  return (
    <Modal
      size="s"
      open={open}
      onOpenChange={() => closeModal(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center text-text-text-and-icon">
            <span className="h-6 w-6 shrink-0">
              <BellLineIcon />
            </span>
            Notify compliances
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <fetcher.Form method="post">
          <input
            type="text"
            name="actionType"
            hidden
            readOnly
            value={ActionEnumType.NOTIFY}
          />
          {ids.map((id) => (
            <input key={id} type="text" name="nodeIds[]" hidden readOnly value={id} />
          ))}

          <div className="grid">
            <span>The selected compliances will be notified.</span>
            <br />
            <SelectNotificationChannel />
            <br />
            {ids.length > 1 ? (
              <>
                <span>Do you want to notify each compliance separately?</span>
                <div className="mt-2">
                  <Checkbox label="Yes notify them separately" name="notifyIndividual" />
                </div>
              </>
            ) : null}
            {fetcher.data?.message && (
              <p className="mt-2 text-p7 text-status-error">{fetcher.data?.message}</p>
            )}
          </div>
          <div className={'flex gap-x-3 justify-end pt-3 mx-2'}>
            <Button
              size="md"
              onClick={() => closeModal(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              type="submit"
            >
              Notify
            </Button>
          </div>
        </fetcher.Form>
      ) : (
        <SuccessModalContent text="Notified successfully!" />
      )}
    </Modal>
  );
};
