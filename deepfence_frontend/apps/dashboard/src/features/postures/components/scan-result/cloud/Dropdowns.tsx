import { Dispatch, ReactNode, SetStateAction, useState } from 'react';
import { Dropdown, DropdownItem } from 'ui-components';

import { ActionEnumType } from '@/features/postures/components/scan-result/cloud/action';
import { NotifyModal } from '@/features/postures/components/scan-result/cloud/Modals';

export const ActionDropdown = ({
  ids,
  trigger,
  setIdsToDelete,
  setShowDeleteDialog,
  onTableAction,
}: {
  ids: string[];
  trigger: ReactNode;
  setIdsToDelete: Dispatch<SetStateAction<string[]>>;
  setShowDeleteDialog: Dispatch<SetStateAction<boolean>>;
  onTableAction: (ids: string[], actionType: string) => void;
}) => {
  const [openNotifyModal, setOpenNotifyModal] = useState<boolean>(false);
  return (
    <>
      {openNotifyModal && (
        <NotifyModal open={true} closeModal={setOpenNotifyModal} ids={ids} />
      )}
      <Dropdown
        triggerAsChild={true}
        align={'start'}
        content={
          <>
            <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.MASK)}>
              Mask
            </DropdownItem>
            <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.UNMASK)}>
              Un-mask
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                setOpenNotifyModal(true);
              }}
            >
              Notify
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                setIdsToDelete(ids);
                setShowDeleteDialog(true);
              }}
              color="error"
            >
              Delete
            </DropdownItem>
          </>
        }
      >
        {trigger}
      </Dropdown>
    </>
  );
};
