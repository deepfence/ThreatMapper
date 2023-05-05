import { Suspense, useMemo } from 'react';
import { IconContext } from 'react-icons';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { HiClock, HiDotsVertical } from 'react-icons/hi';
import { ActionFunctionArgs, useFetcher, useLoaderData } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, PostgresqlDbScheduler } from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

type LoaderDataType = {
  message?: string;
  data?: PostgresqlDbScheduler[];
};
const getData = async (): Promise<LoaderDataType> => {
  const response = await makeRequest({
    apiFunction: getSettingsApiClient().getScheduledTasks,
    apiArgs: [],
  });

  if (ApiError.isApiError(response)) {
    return {
      message: 'Error in getting Scheduled Jobs list',
    };
  }

  return {
    data: response,
  };
};
const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getData(),
  });
};

export type ActionReturnType = {
  message?: string;
  success: boolean;
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const id = Number(body.id);
  const isEnabled = body.isEnabled === 'true';

  const r = await makeRequest({
    apiFunction: getSettingsApiClient().updateScheduledTask,
    apiArgs: [
      {
        id,
        modelUpdateScheduledTaskRequest: {
          is_enabled: isEnabled,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({ success: false });
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
          success: false,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  toast('Scheduled job status updated sucessfully');
  return {
    success: true,
  };
};
const ActionDropdown = ({ scheduler }: { scheduler: PostgresqlDbScheduler }) => {
  const fetcher = useFetcher();
  const toggle = (scheduler: PostgresqlDbScheduler) => {
    if (scheduler.id) {
      const formData = new FormData();
      formData.append('id', scheduler.id?.toString() ?? '');
      formData.append('isEnabled', (!scheduler.is_enabled)?.toString() ?? '');
      fetcher.submit(formData, {
        method: 'post',
      });
    }
  };
  return (
    <>
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <DropdownItem
            className="text-sm"
            onClick={() => {
              toggle(scheduler);
            }}
          >
            <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
              <IconContext.Provider
                value={{ className: 'text-gray-700 dark:text-gray-400' }}
              >
                {scheduler.is_enabled ? <FaEyeSlash /> : <FaEye />}
              </IconContext.Provider>
              {scheduler.is_enabled ? 'Disable' : 'Enable'}
            </span>
          </DropdownItem>
        }
      >
        <Button size="xs" color="normal" className="hover:bg-transparent">
          <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
            <HiDotsVertical />
          </IconContext.Provider>
        </Button>
      </Dropdown>
    </>
  );
};

const ScheduledJobs = () => {
  const columnHelper = createColumnHelper<PostgresqlDbScheduler>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('created_at', {
        cell: (cell) => formatMilliseconds(cell.getValue() || ''),
        header: () => 'Timestamp',
        minSize: 30,
        size: 50,
        maxSize: 60,
      }),
      columnHelper.accessor('action', {
        cell: (cell) => cell.getValue(),
        header: () => 'Action',
        minSize: 30,
        size: 50,
        maxSize: 85,
      }),
      columnHelper.accessor('description', {
        cell: (cell) => cell.getValue(),
        header: () => 'Description',
        minSize: 30,
        size: 90,
        maxSize: 100,
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
        header: () => 'Cron Expression',
        minSize: 30,
        size: 40,
        maxSize: 85,
      }),
      columnHelper.accessor('is_enabled', {
        cell: (cell) =>
          cell.getValue() ? (
            <span className="text-green-600 dark:text-green-500">Yes</span>
          ) : (
            <span className="text-red-600 dark:text-red-500">No</span>
          ),
        header: () => 'Enabled',
        minSize: 30,
        size: 30,
        maxSize: 85,
      }),
      columnHelper.accessor('status', {
        cell: (cell) => cell.getValue(),
        header: () => 'Status',
        minSize: 30,
        size: 30,
        maxSize: 85,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('Scheduled job id not found');
          }
          return <ActionDropdown scheduler={cell.row.original} />;
        },
        header: () => '',
        minSize: 20,
        size: 20,
        maxSize: 20,
        enableResizing: false,
      }),
    ];
    return columns;
  }, []);

  return (
    <SettingsTab value="scheduled-jobs">
      <div className="h-full mt-2">
        <div className="mt-4">
          <div className="flex justify-between">
            <div>
              <div className="mt-2 flex gap-x-2 items-center">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
                  <IconContext.Provider
                    value={{
                      className: 'text-blue-600 dark:text-blue-400',
                    }}
                  >
                    <HiClock />
                  </IconContext.Provider>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white text-base">
                  Scheduled Jobs
                </h3>
              </div>
            </div>
          </div>
          <Suspense
            fallback={<TableSkeleton columns={8} rows={5} size={'sm'} className="mt-4" />}
          >
            <DFAwait resolve={loaderData.data}>
              {(resolvedData: LoaderDataType) => {
                const { data, message } = resolvedData;
                const list = data ?? [];
                return (
                  <div className="mt-4">
                    {message ? (
                      <p className="text-red-500 text-sm">{message}</p>
                    ) : (
                      <Table
                        size="sm"
                        data={list}
                        columns={columns}
                        enableColumnResizing
                        enableSorting
                      />
                    )}
                  </div>
                );
              }}
            </DFAwait>
          </Suspense>
        </div>
      </div>
    </SettingsTab>
  );
};

export const module = {
  element: <ScheduledJobs />,
  loader,
  action,
};
