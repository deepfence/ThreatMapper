import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useCallback, useMemo } from 'react';
import { Outlet, useFetcher, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Modal,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { ModelAIIntegrationListResponse } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { PlusIcon } from '@/components/icons/common/Plus';
import { IntegrationsIcon } from '@/components/sideNavigation/icons/Integrations';
import { TruncatedText } from '@/components/TruncatedText';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { queries } from '@/queries';

export const CLOUD_TRAIL_ALERT = 'CloudTrail Alert';
export const USER_ACTIVITIES = 'User Activities';

export enum ActionEnumType {
  DELETE = 'delete',
  MAKE_DEFAULT = 'make_default',
}

export const useListIntegrations = () => {
  return useSuspenseQuery({
    ...queries.integration.listIntegrations(),
  });
};

type ActionData = {
  message?: string;
  success?: boolean;
};

const DeleteConfirmationModal = ({
  showDialog,
  row,
  setShowDialog,
}: {
  showDialog: boolean;
  row: ModelAIIntegrationListResponse | undefined;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('_actionType', actionType);
      formData.append('id', row?.id?.toString() ?? '');

      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher, row],
  );
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
            Delete integration
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
          <span>The selected integration will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message ? (
            <p className="mt-2 dark:text-status-error text-p7">{fetcher.data?.message}</p>
          ) : null}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

const AIIntegrationList = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="px-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<IntegrationsIcon />} isLink>
            <DFLink to={'/integrations'} unstyled>
              Integrations
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Generative AI</span>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>
      <div className="m-4">
        <div className="flex gapx-8">
          <Button
            variant="flat"
            startIcon={<PlusIcon />}
            onClick={() => {
              navigate('./add');
            }}
            size="sm"
          >
            Add new integration
          </Button>
        </div>
        <div className="self-start mt-2">
          <Suspense fallback={<TableSkeleton columns={4} rows={5} />}>
            <AIIntegrationTable />
          </Suspense>
        </div>
      </div>
      <Outlet />
    </>
  );
};

function useListAIIntegrations() {
  return useSuspenseQuery({
    ...queries.integration.listAIIntegrations(),
  });
}

const ActionDropdown = ({
  row,
  trigger,
  onTableAction,
}: {
  row: ModelAIIntegrationListResponse;
  trigger: React.ReactNode;
  onTableAction: (
    row: ModelAIIntegrationListResponse,
    actionType: ActionEnumType,
  ) => void;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          <DropdownItem onClick={() => onTableAction(row, ActionEnumType.MAKE_DEFAULT)}>
            Make default
          </DropdownItem>
          <DropdownItem
            onClick={() => onTableAction(row, ActionEnumType.DELETE)}
            className="dark:text-status-error dark:hover:text-[#C45268]"
          >
            Delete
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

const AIIntegrationTable = () => {
  const { data } = useListAIIntegrations();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<ModelAIIntegrationListResponse>();

    const columns = [
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          const id = cell.row.original.id;
          if (!id) {
            throw new Error('Integration id not found');
          }
          return (
            <ActionDropdown
              row={cell.row.original}
              onTableAction={(row, actionType) => {
                // todo
              }}
              trigger={
                <button className="p-1">
                  <div className="h-[16px] w-[16px] dark:text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 30,
        size: 30,
        maxSize: 35,
        enableResizing: false,
      }),
      columnHelper.accessor('id', {
        header: () => 'ID',
        size: 50,
        minSize: 50,
        maxSize: 50,
      }),
      columnHelper.accessor('integration_type', {
        header: () => 'Type',
        size: 100,
        minSize: 50,
        maxSize: 150,
      }),
      columnHelper.accessor('label', {
        header: () => 'Label',
        size: 100,
        minSize: 50,
        maxSize: 150,
      }),
      columnHelper.accessor('default_integration', {
        header: () => 'Is Default?',
        cell: (info) => {
          return info.getValue() ? 'Yes' : 'No';
        },
        size: 100,
        minSize: 50,
        maxSize: 150,
      }),
      columnHelper.accessor('last_error_msg', {
        header: () => 'Last Error Message',
        cell: (info) => {
          const error = info.getValue();

          if (!error?.length) return '-';
          return <TruncatedText text={error} />;
        },
        size: 150,
        minSize: 50,
        maxSize: 250,
      }),
    ];

    return columns;
  }, []);

  return (
    <Table
      data={data}
      columns={columns}
      enableColumnResizing
      noDataElement={
        <TableNoDataElement text="No integrations found, please add new integration" />
      }
    />
  );
};

export const module = {
  element: <AIIntegrationList />,
};
