import { useState } from 'react';
import { Button, Dropdown, DropdownItem } from 'ui-components';

import { BellLineIcon } from '@/components/icons/common/BellLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { EyeHideSolid } from '@/components/icons/common/EyeHideSolid';
import { EyeSolidIcon } from '@/components/icons/common/EyeSolid';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { ActionEnumType } from '@/features/postures/components/scan-result/cloud/action';
import { NotifyModal } from '@/features/postures/components/scan-result/cloud/Modals';

export const BulkActions = ({
  ids,
  setIdsToDelete,
  setShowDeleteDialog,
  onTableAction,
}: {
  ids: string[];
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onTableAction: (ids: string[], actionType: string) => void;
}) => {
  const [openNotifyModal, setOpenNotifyModal] = useState<boolean>(false);
  return (
    <>
      {openNotifyModal && (
        <NotifyModal open={true} closeModal={setOpenNotifyModal} ids={ids} />
      )}
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!ids.length}
        content={
          <>
            <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.MASK)}>
              Mask
            </DropdownItem>
          </>
        }
      >
        <Button
          color="default"
          variant="flat"
          size="sm"
          startIcon={<EyeSolidIcon />}
          endIcon={<CaretDown />}
          disabled={!ids.length}
        >
          Mask
        </Button>
      </Dropdown>
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!ids.length}
        content={
          <>
            <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.UNMASK)}>
              Un-mask
            </DropdownItem>
          </>
        }
      >
        <Button
          color="default"
          variant="flat"
          size="sm"
          startIcon={<EyeHideSolid />}
          endIcon={<CaretDown />}
          disabled={!ids.length}
        >
          Unmask
        </Button>
      </Dropdown>
      <Button
        variant="flat"
        size="sm"
        startIcon={<BellLineIcon />}
        disabled={!ids.length}
        onClick={() => {
          setOpenNotifyModal(true);
        }}
      >
        Notify
      </Button>
      <Button
        color="error"
        variant="flat"
        size="sm"
        startIcon={<TrashLineIcon />}
        disabled={!ids.length}
        onClick={() => {
          setIdsToDelete(ids);
          setShowDeleteDialog(true);
        }}
      >
        Delete
      </Button>
    </>
  );
};
