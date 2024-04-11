import { useSuspenseQuery } from '@suspensive/react-query';
import { upperFirst } from 'lodash-es';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Modal,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { PostgresqlDbScheduler } from '@/api/generated';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { TruncatedText } from '@/components/TruncatedText';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';

export type ActionReturnType = {
  message?: string;
  success: boolean;
};

enum ActionEnumType {
  ENABLE_DISABLE = 'enable_disable',
  DELETE = 'delete',
}
export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const id = Number(body.id);

  if (body.actionType === ActionEnumType.ENABLE_DISABLE) {
    const isEnabled = body.isEnabled === 'true';

    const updateApi = apiWrapper({
      fn: getSettingsApiClient().updateScheduledTask,
    });
    const updateResponse = await updateApi({
      id,
      modelUpdateScheduledTaskRequest: {
        is_enabled: isEnabled,
      },
    });
    if (!updateResponse.ok) {
      if (updateResponse.error.response.status === 400) {
        const { message } = await getResponseErrors(updateResponse.error);
        return {
          success: false,
          message,
        };
      } else if (updateResponse.error.response.status === 403) {
        const message = await get403Message(updateResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw updateResponse.error;
    }
  } else if (body.actionType === ActionEnumType.DELETE) {
    const ids = (formData.getAll('ids[]') ?? []) as string[];
    const deleteApi = apiWrapper({
      fn: getSettingsApiClient().deleteCustomScheduledTask,
    });
    const deleteResponse = await deleteApi({
      id: parseInt(ids[0], 10),
    });
    if (!deleteResponse.ok) {
      if (deleteResponse.error.response.status === 400) {
        const { message } = await getResponseErrors(deleteResponse.error);
        return {
          success: false,
          message,
        };
      } else if (deleteResponse.error.response.status === 403) {
        const message = await get403Message(deleteResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw deleteResponse.error;
    }
    toast.success('Deleted successfully');
  }

  invalidateAllQueries();
  return {
    success: true,
  };
};
const useJobs = () => {
  return useSuspenseQuery({
    ...queries.setting.listScheduledJobs(),
  });
};
const DeleteConfirmationModal = ({
  showDialog,
  ids,
  setShowDialog,
}: {
  showDialog: boolean;
  ids: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionReturnType>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      ids.forEach((item) => formData.append('ids[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids, fetcher],
  );

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
            Delete schedule job
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
          <span>The selected schedule will be deleted.</span>
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

const ActionDropdown = ({
  trigger,
  scheduler,
  onTableAction,
  setIdsToDelete,
  setShowDialog,
}: {
  trigger: React.ReactNode;
  scheduler: PostgresqlDbScheduler;
  onTableAction: (scheduler: PostgresqlDbScheduler, actionType: ActionEnumType) => void;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          <DropdownItem
            onClick={() => onTableAction(scheduler, ActionEnumType.ENABLE_DISABLE)}
          >
            {scheduler.is_enabled ? 'Disable' : 'Enable'}
          </DropdownItem>
          {!scheduler.is_system ? (
            <DropdownItem
              onClick={() => {
                if (scheduler.id) {
                  setShowDialog(true);
                  setIdsToDelete([scheduler.id.toString()]);
                } else {
                  console.warn('No schedule job to delete');
                }
              }}
              color="error"
            >
              Delete
            </DropdownItem>
          ) : null}
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};
const getFormattedNodeType = (column: PostgresqlDbScheduler) => {
  const isSystem = column.is_system;
  if (isSystem) {
    return column.payload.node_type ?? '';
  }
  const nodeIds: {
    node_type: string;
  }[] = column.payload?.node_ids ?? [];

  if (nodeIds.length === 1) {
    return upperFirst(nodeIds[0].node_type);
  }
  const nodeTypeMap: Record<string, number> = {};
  nodeIds.forEach((node) => {
    if (nodeTypeMap[node.node_type] !== undefined) {
      nodeTypeMap[node.node_type] = nodeTypeMap[node.node_type] + 1;
    } else {
      nodeTypeMap[node.node_type] = 1;
    }
  });
  const nodes = Object.keys(nodeTypeMap)
    .map((key) => {
      const value = nodeTypeMap[key];
      return `${value} ${upperFirst(key)}`;
    })
    .join(', ');
  return nodes;
};

const ScheduledJobsTable = ({
  onTableAction,
  setIdsToDelete,
  setShowDialog,
}: {
  onTableAction: (scheduler: PostgresqlDbScheduler, actionType: ActionEnumType) => void;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { data } = useJobs();
  const columnHelper = createColumnHelper<PostgresqlDbScheduler>();
  const [pageSize, setPageSize] = useState(15);
  const columns = useMemo(() => {
    const columns = [
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('Scheduled job id not found');
          }
          return (
            <ActionDropdown
              scheduler={cell.row.original}
              onTableAction={onTableAction}
              setShowDialog={setShowDialog}
              setIdsToDelete={setIdsToDelete}
              trigger={
                <button className="p-1">
                  <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 25,
        size: 25,
        maxSize: 25,
        enableResizing: false,
      }),
      columnHelper.accessor('created_at', {
        cell: (cell) => (
          <TruncatedText text={formatMilliseconds(cell.getValue() || '')} />
        ),
        header: () => 'Timestamp',
        minSize: 30,
        size: 50,
        maxSize: 60,
      }),
      columnHelper.accessor('action', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => 'Action',
        minSize: 30,
        size: 50,
        maxSize: 85,
      }),
      columnHelper.accessor('description', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => 'Description',
        minSize: 50,
        size: 60,
        maxSize: 70,
      }),
      columnHelper.accessor('payload', {
        cell: (cell) => <TruncatedText text={getFormattedNodeType(cell.row.original)} />,
        header: () => 'Node type',
        minSize: 30,
        size: 40,
        maxSize: 85,
      }),
      columnHelper.accessor('cron_expr', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => <TruncatedText text="Cron expression" />,
        minSize: 30,
        size: 50,
        maxSize: 60,
      }),
      columnHelper.accessor('is_enabled', {
        cell: (cell) => (cell.getValue() ? <span>Yes</span> : <span>No</span>),
        header: () => <TruncatedText text="Enabled" />,
        minSize: 30,
        size: 30,
        maxSize: 85,
      }),
      columnHelper.accessor('payload', {
        cell: (cell) => <TruncatedText text={JSON.stringify(cell.getValue())} />,
        header: () => <TruncatedText text="Payload" />,
        minSize: 40,
        size: 50,
        maxSize: 60,
      }),
    ];
    return columns;
  }, []);
  return (
    <div className="mt-2">
      {data.message ? (
        <p className="text-status-error text-p7">{data.message}</p>
      ) : (
        <Table
          size="default"
          getRowId={(row) => `${row.id}`}
          data={data.data ?? []}
          columns={columns}
          enableColumnResizing
          enableSorting
          enablePageResize
          pageSize={pageSize}
          enablePagination
          onPageResize={(newSize) => {
            setPageSize(newSize);
          }}
        />
      )}
    </div>
  );
};

const ScheduledJobs = () => {
  const fetcher = useFetcher();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);

  const onTableAction = useCallback(
    (scheduler: PostgresqlDbScheduler, actionType: ActionEnumType) => {
      if (scheduler.id) {
        const formData = new FormData();
        formData.append('id', scheduler.id?.toString() ?? '');
        formData.append('actionType', actionType);
        if (actionType === ActionEnumType.ENABLE_DISABLE) {
          formData.append('isEnabled', (!scheduler.is_enabled)?.toString() ?? '');
        }
        fetcher.submit(formData, {
          method: 'post',
        });
      }
    },
    [fetcher],
  );

  return (
    <>
      <div className="flex justify-between">
        <div>
          <div className="mt-2">
            <h3 className="text-h6 text-text-input-value">Scheduled jobs</h3>
          </div>
        </div>
      </div>
      <Suspense
        fallback={
          <TableSkeleton columns={8} rows={5} size={'default'} className="mt-4" />
        }
      >
        <ScheduledJobsTable
          onTableAction={onTableAction}
          setIdsToDelete={setIdsToDelete}
          setShowDialog={setShowDeleteDialog}
        />
      </Suspense>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          ids={idsToDelete}
          setShowDialog={setShowDeleteDialog}
        />
      )}
    </>
  );
};

export const module = {
  element: <ScheduledJobs />,
  action,
};
