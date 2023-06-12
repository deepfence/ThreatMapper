import { isEmpty } from 'lodash-es';
import { useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiArchive, HiDotsVertical, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useFetcher, useParams } from 'react-router-dom';
import { Button, createColumnHelper, Dropdown, DropdownItem, Modal } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';

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

  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      {!fetcher.data?.deleteSuccess ? (
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
            <Button size="xs" onClick={() => setShowDialog(false)} type="button" outline>
              No, Cancel
            </Button>
            <Button
              size="xs"
              color="danger"
              disabled={fetcher.state !== 'idle'}
              loading={fetcher.state !== 'idle'}
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
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
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
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          id={id}
          setShowDialog={setShowDeleteDialog}
        />
      )}
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
      case IntegrationType.jira:
        return [
          columnHelper.accessor(
            (cell) => {
              if (isEmpty(cell.config)) {
                return '-';
              }
              const isToken = cell.config?.api_token !== undefined;
              if (isToken) {
                return 'Token';
              } else {
                return 'Password';
              }
            },
            {
              id: 'api_token',
              header: () => 'Auth Type',
              minSize: 50,
              size: 55,
              maxSize: 60,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.issueType : '-'),
            {
              id: 'issueType',
              header: () => 'Issue Type',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.jiraAssignee : '-'),
            {
              id: 'jiraAssignee',
              header: () => 'Assigne',
              minSize: 50,
              size: 55,
              maxSize: 60,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.username : '-'),
            {
              id: 'username',
              header: () => 'Username',
              minSize: 50,
              size: 55,
              maxSize: 60,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.jiraSiteUrl : '-'),
            {
              id: 'jiraSiteUrl',
              header: () => 'Url',
              minSize: 50,
              size: 55,
              maxSize: 60,
            },
          ),
        ];
      case IntegrationType.splunk:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.endpoint_url : '-'),
            {
              id: 'endpoint_url',
              header: () => 'Endpoint Url',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.token : '-'),
            {
              id: 'token',
              header: () => 'Token',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
        ];
      case IntegrationType.elasticsearch:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.endpoint_url : '-'),
            {
              id: 'endpoint_url',
              header: () => 'Endpoint Url',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.index : '-'),
            {
              id: 'index',
              header: () => 'Index',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.auth_header : '-'),
            {
              id: 'auth_header',
              header: () => 'Auth',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.docType : '-'),
            {
              id: 'docType',
              header: () => 'Doc Type',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
        ];
      case IntegrationType.sumoLogic:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.endpoint_url : '-'),
            {
              id: 'endpoint_url',
              header: () => 'Endpoint Url',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
        ];
      case IntegrationType.googleChronicle:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.url : '-'),
            {
              id: 'url',
              header: () => 'Endpoint Url',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.auth_header : '-'),
            {
              id: 'auth_header',
              header: () => 'Auth Header',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
        ];
      case IntegrationType.awsSecurityHub:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.aws_access_key : '-'),
            {
              id: 'aws_access_key',
              header: () => 'Access Key',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.aws_secret_key : '-'),
            {
              id: 'aws_secret_key',
              header: () => 'Secret Key',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.aws_region : '-'),
            {
              id: 'aws_region',
              header: () => 'Region',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
        ];
      case IntegrationType.microsoftTeams:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.webhook_url : '-'),
            {
              id: 'webhook_url',
              header: () => 'Webhook Url',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
        ];
      case IntegrationType.pagerDuty:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.service_key : '-'),
            {
              id: 'service_key',
              header: () => 'Service Key',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.api_key : '-'),
            {
              id: 'api_key',
              header: () => 'Api Key',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
        ];
      case IntegrationType.httpEndpoint:
        return [
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.url : '-'),
            {
              id: 'url',
              header: () => 'Url',
              minSize: 45,
              size: 50,
              maxSize: 55,
            },
          ),
          columnHelper.accessor(
            (cell) => (!isEmpty(cell.config) ? cell.config.auth_header : '-'),
            {
              id: 'auth_header',
              header: () => 'Auth Header',
              minSize: 45,
              size: 50,
              maxSize: 55,
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
