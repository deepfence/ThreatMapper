import { isEmpty } from 'lodash-es';
import { useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiArchive, HiDotsVertical, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useFetcher, useParams } from 'react-router-dom';
import { Button, createColumnHelper, Dropdown, DropdownItem, Modal } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';

import { IntegrationType } from './IntegrationForm';

const DeleteConfirmationModal = ({
  showDialog,
  id,
  setShowDialog,
}: {
  showDialog: boolean;
  id: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<{
    deleteSuccess: boolean;
    message: string;
  }>();

  if (fetcher.data?.deleteSuccess) {
    setShowDialog(false);
  }
  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <div className="grid place-items-center p-6">
        <IconContext.Provider
          value={{
            className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
          }}
        >
          <HiOutlineExclamationCircle />
        </IconContext.Provider>
        <h3 className="mb-4 font-normal text-center text-sm">
          The selected integration will be deleted.
          <br />
          <span>Are you sure you want to delete?</span>
        </h3>

        {fetcher.data?.message ? (
          <p className="text-red-500 text-sm pb-4">{fetcher.data?.message}</p>
        ) : null}

        <div className="flex items-center justify-right gap-4">
          <Button size="xs" onClick={() => setShowDialog(false)}>
            No, cancel
          </Button>
          <Button
            size="xs"
            color="danger"
            onClick={() => {
              const formData = new FormData();
              formData.append('_actionType', 'delete');
              formData.append('id', id);
              fetcher.submit(formData, {
                method: 'post',
              });
            }}
          >
            Yes, I&apos;m sure
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ActionDropdown = ({
  icon,
  id,
  label,
}: {
  icon: React.ReactNode;
  id: string;
  label?: string;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <DeleteConfirmationModal
        showDialog={showDeleteDialog}
        id={id}
        setShowDialog={setShowDeleteDialog}
      />
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem
              className="text-sm"
              onClick={() => {
                setShowDeleteDialog(true);
              }}
            >
              <span className="flex items-center gap-x-2 text-red-700 dark:text-red-400">
                <IconContext.Provider
                  value={{ className: 'text-red-700 dark:text-red-400' }}
                >
                  <HiArchive />
                </IconContext.Provider>
                Delete
              </span>
            </DropdownItem>
          </>
        }
      >
        <Button size="xs" color="normal" className="hover:bg-transparent">
          <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
            {icon}
          </IconContext.Provider>
          {label ? <span className="ml-2">{label}</span> : null}
        </Button>
      </Dropdown>
    </>
  );
};

export const useIntegrationTableColumn = () => {
  const { integrationType } = useParams() as {
    integrationType: string;
  };

  if (!integrationType) {
    throw new Error('Integration Type is required');
  }
  const columnHelper = createColumnHelper<ModelIntegrationListResp>();

  const getDynamicTableColumns = () => {
    switch (integrationType) {
      case IntegrationType.slack:
        return [
          columnHelper.accessor('channel', {
            cell: (cell) => cell.row.original.config?.channel,
            header: () => 'Channel',
            minSize: 75,
            size: 80,
            maxSize: 85,
          }),
          columnHelper.accessor('webhook_url', {
            cell: (cell) => cell.row.original.config?.webhook_url,
            header: () => 'URL',
            minSize: 75,
            size: 80,
            maxSize: 85,
          }),
        ];
      case IntegrationType.s3:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.aws_region : '-'),
            {
              id: 'aws_region',
              header: () => 'Region',
              minSize: 50,
              size: 55,
              maxSize: 60,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.s3_bucket_name : '-'),
            {
              id: 's3_bucket_name',
              header: () => 'Bucket Name',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.s3_folder_name : '-'),
            {
              id: 's3_folder_name',
              header: () => 'Folder Name',
              minSize: 50,
              size: 55,
              maxSize: 60,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.aws_access_key : '-'),
            {
              id: 'aws_access_key',
              header: () => 'Access Key',
              minSize: 50,
              size: 55,
              maxSize: 60,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.aws_secret_key : '-'),
            {
              id: 'aws_secret_key',
              header: () => 'Secret Key',
              minSize: 50,
              size: 55,
              maxSize: 60,
            },
          ),
        ];
      default:
        console.warn('Dynamic columns valid integration type');
        return [];
    }
  };

  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('id', {
        cell: (cell) => cell.getValue(),
        header: () => 'ID',
        minSize: 35,
        size: 40,
        maxSize: 45,
      }),
      columnHelper.accessor('integration_type', {
        cell: (cell) => cell.getValue(),
        header: () => 'Integration Type',
        minSize: 65,
        size: 70,
        maxSize: 75,
      }),
      columnHelper.accessor('notification_type', {
        cell: (cell) => cell.getValue(),
        header: () => 'Notification Type',
        minSize: 65,
        size: 70,
        maxSize: 75,
      }),
      ...getDynamicTableColumns(),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          const id = cell.row.original.id;
          if (!id) {
            throw new Error('Integration id not found');
          }
          return <ActionDropdown icon={<HiDotsVertical />} id={id.toString()} />;
        },
        header: () => '',
        minSize: 30,
        size: 30,
        maxSize: 35,
        enableResizing: false,
      }),
    ];
    return columns;
  }, []);
  return columns;
};
