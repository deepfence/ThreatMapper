import { Button, Modal } from 'ui-components';

import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';

export const UnsavedChangesWarningModal = ({
  onWarnModalClose,
}: {
  onWarnModalClose: (state: boolean) => void;
}) => {
  return (
    <Modal
      title={
        <div className="flex gap-3 items-center text-status-warning">
          <span className="h-6 w-6 shrink-0">
            <ErrorStandardLineIcon />
          </span>
          Unsaved Changes
        </div>
      }
      open={true}
      onOpenChange={(state) => {
        onWarnModalClose(state);
      }}
    >
      <span>
        You have some unsaved changes to the form. Are you sure you want to discard the
        changes?
      </span>
      <br />
      <br />
      <div className={'flex gap-x-4 justify-end'}>
        <Button variant="outline" type="button" onClick={() => onWarnModalClose(false)}>
          Keep Editing
        </Button>
        <Button
          size="md"
          type="button"
          color="error"
          onClick={(e) => {
            e.preventDefault();
            onWarnModalClose(true);
          }}
        >
          Discard
        </Button>
      </div>
    </Modal>
  );
};
