import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import {
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { PostgresqlDbScheduler } from '@/api/generated';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { TruncatedText } from '@/components/TruncatedText';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';

export type ActionReturnType = {
  message?: string;
  success: boolean;
};
enum ActionEnumType {
  ENABLE_DISABLE = 'enable_disable',
}
export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const id = Number(body.id);
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
      return {
        success: false,
        message: updateResponse.error.message,
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

  toast.success('Updated sucessfully');
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
const ActionDropdown = ({
  trigger,
  scheduler,
  onTableAction,
}: {
  trigger: React.ReactNode;
  scheduler: PostgresqlDbScheduler;
  onTableAction: (scheduler: PostgresqlDbScheduler, actionType: string) => void;
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
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

const ScheduledJobsTable = ({
  onTableAction,
}: {
  onTableAction: (scheduler: PostgresqlDbScheduler, actionType: string) => void;
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
        cell: (cell) => cell.row.original.payload.node_type,
        header: () => 'Node Type',
        minSize: 30,
        size: 40,
        maxSize: 85,
      }),
      columnHelper.accessor('cron_expr', {
        cell: (cell) => cell.getValue(),
        header: () => <TruncatedText text="Cron Expression" />,
        minSize: 30,
        size: 40,
        maxSize: 85,
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
        <p className="dark:text-status-error text-p7">{data.message}</p>
      ) : (
        <Table
          size="default"
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

  const onTableAction = useCallback(
    (scheduler: PostgresqlDbScheduler, actionType: string) => {
      if (scheduler.id) {
        const formData = new FormData();
        formData.append('id', scheduler.id?.toString() ?? '');
        formData.append('isEnabled', (!scheduler.is_enabled)?.toString() ?? '');
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
            <h3 className="text-h6 dark:text-text-input-value">Scheduled jobs</h3>
          </div>
        </div>
      </div>
      <Suspense
        fallback={
          <TableSkeleton columns={8} rows={5} size={'default'} className="mt-4" />
        }
      >
        <ScheduledJobsTable onTableAction={onTableAction} />
      </Suspense>
    </>
  );
};

export const module = {
  element: <ScheduledJobs />,
  action,
};
