import { Suspense, useMemo } from 'react';
import {
  ActionFunctionArgs,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from 'react-router-dom';
import { useInterval } from 'react-use';
import { toast } from 'sonner';
import { Button, createColumnHelper, Table, TableSkeleton } from 'ui-components';

import { getDiagnosisApiClient } from '@/api/api';
import {
  DiagnosisDiagnosticLogsLink,
  DiagnosisGetDiagnosticLogsResponse,
  DiagnosisNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

type LoaderDataType = {
  message?: string;
  data?: DiagnosisGetDiagnosticLogsResponse;
};
const getDiagnosticLogs = async (): Promise<LoaderDataType> => {
  const getDiagnosticLogs = apiWrapper({ fn: getDiagnosisApiClient().getDiagnosticLogs });
  const response = await getDiagnosticLogs();

  if (!response.ok) {
    if (response.error.response.status === 403) {
      return {
        message: 'You do not have enough permissions to view diagnostic logs',
      };
    }
    throw response.error;
  }

  return {
    data: response.value,
  };
};

const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getDiagnosticLogs(),
  });
};

const ACTION_TYPE = {
  CONSOLE_LOGS: 'consoleLogs',
  AGENT_LOGS: 'agentLogs',
};

const action = async ({ request }: ActionFunctionArgs): Promise<string | null> => {
  const formData = await request.formData();
  const actionType = formData.getAll('actionType')?.toString();

  // host filter
  const selectedHostLength = Number(formData.get('selectedHostLength'));
  const nodeIds = [];
  if (selectedHostLength > 0) {
    for (let i = 0; i < selectedHostLength; i++) {
      nodeIds.push(formData.get(`hostFilter[${i}]`) as string);
    }
  }

  // cluster filter
  const selectedClusterLength = Number(formData.get('selectedClusterLength'));
  const clusterIds = [];
  if (selectedClusterLength > 0) {
    for (let i = 0; i < selectedClusterLength; i++) {
      clusterIds.push(formData.get(`clusterFilter[${i}]`) as string);
    }
  }

  if (
    actionType === ACTION_TYPE.AGENT_LOGS &&
    nodeIds.length === 0 &&
    clusterIds.length === 0
  ) {
    return 'Please select at least one host/cluster';
  }
  if (!actionType) {
    return 'You have not triggered any action';
  }
  if (actionType === ACTION_TYPE.AGENT_LOGS) {
    const _hosts = nodeIds.map((node) => {
      return {
        node_id: node,
        node_type: DiagnosisNodeIdentifierNodeTypeEnum.Host,
      };
    });

    const _clusters = clusterIds.map((cluster) => {
      return {
        node_id: cluster,
        node_type: DiagnosisNodeIdentifierNodeTypeEnum.Cluster,
      };
    });

    const logsApi = apiWrapper({
      fn: getDiagnosisApiClient().generateAgentDiagnosticLogs,
    });
    const logsResponse = await logsApi({
      diagnosisGenerateAgentDiagnosticLogsRequest: {
        node_ids: [..._hosts, ..._clusters],
        tail: 10000,
      },
    });
    if (!logsResponse.ok) {
      if (logsResponse.error.response.status === 400) {
        return logsResponse.error.message;
      } else if (logsResponse.error.response.status === 403) {
        return 'You do not have enough permissions to view diagnostic logs';
      }
      throw logsResponse.error;
    }
  } else if (actionType === ACTION_TYPE.CONSOLE_LOGS) {
    const logsApi = apiWrapper({
      fn: getDiagnosisApiClient().generateConsoleDiagnosticLogs,
    });
    const logsResponse = await logsApi({
      diagnosisGenerateConsoleDiagnosticLogsRequest: {
        tail: 10000,
      },
    });
    if (!logsResponse.ok) {
      if (logsResponse.error.response.status === 400) {
        return logsResponse.error.message;
      } else if (logsResponse.error.response.status === 403) {
        return 'You do not have enough permissions to view diagnostic logs';
      }
      throw logsResponse.error;
    }
  }

  toast('You have successfully generated the logs');

  return null;
};

const ConsoleDiagnosticLogsTable = () => {
  const columnHelper = createColumnHelper<DiagnosisDiagnosticLogsLink>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('label', {
        cell: (cell) => cell.getValue(),
        header: () => 'Label',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('created_at', {
        cell: (cell) => {
          const createdAt = cell.getValue();
          if (createdAt) {
            return formatMilliseconds(createdAt);
          }
        },
        header: () => 'Created At',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('message', {
        cell: (cell) => cell.getValue(),
        header: () => 'Message',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('url_link', {
        cell: (cell) => {
          if (cell.row.original.message !== '') {
            return 'No logs';
          }
          return (
            <DFLink href={cell.row.original.url_link ?? ''} download target={'_blank'}>
              Click to download
            </DFLink>
          );
        },
        header: () => 'Download',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
    ];
    return columns;
  }, []);

  return (
    <>
      <Suspense fallback={<TableSkeleton columns={4} rows={5} size={'sm'} />}>
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: LoaderDataType) => {
            const { data, message } = resolvedData;
            const logs = data?.console_logs ?? [];

            return (
              <div>
                <h3 className="py-2 font-medium text-gray-900 dark:text-white text-base">
                  Console Diagnostic Logs
                </h3>
                {message ? (
                  <p className="text-red-500 text-sm">{message}</p>
                ) : (
                  <Table
                    size="sm"
                    data={logs}
                    columns={columns}
                    enablePagination
                    pageSize={5}
                  />
                )}
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </>
  );
};
const AgentDiagnosticLogsTable = () => {
  const columnHelper = createColumnHelper<DiagnosisDiagnosticLogsLink>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('label', {
        cell: (cell) => cell.getValue(),
        header: () => 'Label',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('created_at', {
        cell: (cell) => cell.getValue(),
        header: () => 'Created At',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('message', {
        cell: (cell) => cell.getValue(),
        header: () => 'Message',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('url_link', {
        cell: (cell) => {
          if (cell.row.original.message !== '') {
            return 'No logs';
          }
          return (
            <DFLink href={cell.row.original.url_link ?? ''} download target={'_blank'}>
              Click to download
            </DFLink>
          );
        },
        header: () => 'Download',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
    ];
    return columns;
  }, []);

  const revalidator = useRevalidator();

  useInterval(() => {
    revalidator.revalidate();
  }, 15000);

  return (
    <>
      <Suspense fallback={<TableSkeleton columns={4} rows={5} size={'sm'} />}>
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: LoaderDataType) => {
            const { data, message } = resolvedData;
            const logs = data?.agent_logs ?? [];

            return (
              <div>
                <h3 className="py-2 font-medium text-gray-900 dark:text-white text-base">
                  Agent Diagnostic Logs
                </h3>
                {message ? (
                  <p className="text-red-500 text-sm">{message}</p>
                ) : (
                  <Table
                    size="sm"
                    data={logs}
                    columns={columns}
                    enablePagination
                    pageSize={5}
                  />
                )}
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </>
  );
};
const ConsoleDiagnosticLogsComponent = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const fetcher = useFetcher<string>();
  const { data } = fetcher;

  return (
    <div className="bg-green-100 dark:bg-green-900/75 text-gray-500 dark:text-gray-300 px-4 pt-4 pb-6 w-fit rounded-lg flex flex-col max-w-[300px]">
      <h4 className="text-lg font-medium pb-2">Console Diagnostic Logs</h4>
      <span className="text-sm text-gray-500 dark:text-gray-300">
        Generate a link to download pdf for your console
      </span>
      <fetcher.Form method="post">
        {loaderData.message ? (
          <p className="text-sm text-red-500 pt-2">{loaderData.message}</p>
        ) : null}
        {data ? <p className="text-sm text-red-500 pt-2">{data}</p> : null}
        <input
          type="text"
          name="actionType"
          readOnly
          hidden
          value={ACTION_TYPE.CONSOLE_LOGS}
        />
        <Button size="xs" className="text-center mt-3 w-full" color="success">
          Get Logs
        </Button>
      </fetcher.Form>
    </div>
  );
};

const AgentDiagnosticLogsComponent = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const fetcher = useFetcher<string>();
  const { data, state } = fetcher;

  return (
    <div className="bg-blue-100 dark:bg-blue-900/75 text-gray-600 dark:text-white px-4 pt-4 pb-6 w-fit rounded-lg flex flex-col max-w-[300px]">
      <h4 className="text-lg font-medium pb-2">Agent Diagnostic Logs</h4>
      <span className="text-sm text-gray-500 dark:text-gray-300">
        Generate a link to download pdf for your host/cluster agent
      </span>
      <fetcher.Form method="post" className="mt-4 flex flex-col gap-y-3">
        {loaderData.message ? (
          <p className="text-sm text-red-500 pt-2">{loaderData.message}</p>
        ) : null}
        {data ? <p className="text-sm text-red-500 pt-2">{data}</p> : null}
        <input
          type="text"
          name="actionType"
          readOnly
          hidden
          value={ACTION_TYPE.AGENT_LOGS}
        />
        <SearchableHostList scanType="none" active={true} pseudo={false} />
        <SearchableClusterList active={true} pseudo={false} />
        <Button
          size="xs"
          className="text-center mt-3 w-full"
          color="primary"
          type="submit"
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
        >
          Get Logs
        </Button>
      </fetcher.Form>
    </div>
  );
};
const DiagnosticLogs = () => {
  return (
    <SettingsTab value="diagnostic-logs">
      <div className="grid grid-cols-[310px_1fr] gap-x-2">
        <div className="flex flex-col mt-2 gap-y-3">
          <ConsoleDiagnosticLogsComponent />
          <AgentDiagnosticLogsComponent />
        </div>
        <div className="flex flex-col gap-y-10">
          <ConsoleDiagnosticLogsTable />
          <AgentDiagnosticLogsTable />
        </div>
      </div>
    </SettingsTab>
  );
};

export const module = {
  element: <DiagnosticLogs />,
  action,
  loader,
};
