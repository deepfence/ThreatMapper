import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher, useRevalidator } from 'react-router-dom';
import { useInterval } from 'react-use';
import { toast } from 'sonner';
import {
  Button,
  createColumnHelper,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getDiagnosisApiClient } from '@/api/api';
import {
  DiagnosisDiagnosticLogsLink,
  DiagnosisNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { invalidateQueries, queries } from '@/queries';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';

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
  invalidateQueries(queries.setting.listDiagnosticLogs._def);
  return null;
};

const useGetLogs = () => {
  return useSuspenseQuery({
    ...queries.setting.listDiagnosticLogs(),
  });
};
const ConsoleDiagnosticLogsTable = () => {
  const columnHelper = createColumnHelper<DiagnosisDiagnosticLogsLink>();
  const { data } = useGetLogs();
  const [pageSize, setPageSize] = useState(5);
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

  const { data: _logs, message } = data;
  const consoleLogs = _logs?.console_logs ?? [];
  if (message) {
    return <p className="dark:text-status-error text-sm">{message}</p>;
  }
  return (
    <Table
      size="compact"
      data={consoleLogs}
      columns={columns}
      enablePagination
      pageSize={pageSize}
      enablePageResize
      onPageResize={(newSize) => {
        setPageSize(newSize);
      }}
    />
  );
};
const AgentDiagnosticLogsTable = () => {
  const columnHelper = createColumnHelper<DiagnosisDiagnosticLogsLink>();
  const { data } = useGetLogs();
  const { data: _logs, message } = data;
  const agentLogs = _logs?.agent_logs ?? [];

  const [pageSize, setPageSize] = useState(5);
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

  if (message) {
    return <p className="dark:text-status-error text-sm">{message}</p>;
  }

  return (
    <>
      <Table
        size="compact"
        data={agentLogs}
        columns={columns}
        enablePagination
        pageSize={pageSize}
        enablePageResize
        onPageResize={(newSize) => {
          setPageSize(newSize);
        }}
      />
    </>
  );
};
const ConsoleDiagnosticLogsComponent = () => {
  const fetcher = useFetcher<string>();

  return (
    <fetcher.Form method="post">
      <input
        type="text"
        name="actionType"
        readOnly
        hidden
        value={ACTION_TYPE.CONSOLE_LOGS}
      />
      <Button variant="flat">Generate console diagnostics logs</Button>
    </fetcher.Form>
  );
};

const AgentDiagnosticsLogsModal = ({
  showDialog,
  setShowDialog,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { data } = useGetLogs();
  const { message } = data;
  const fetcher = useFetcher<string>();

  return (
    <SlidingModal size="s" open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <SlidingModalHeader>
        <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-breadcrumb-bar">
          Agent diagnostic logs
        </div>
      </SlidingModalHeader>
      <SlidingModalCloseButton />
      <SlidingModalContent>
        <div className="m-4">
          <span className="text-sm text-gray-500 dark:text-gray-300">
            Generate a link to download pdf for your host/cluster agent
          </span>
          <fetcher.Form method="post" className="mt-4 flex flex-col gap-y-3">
            {message ? (
              <p className="text-p7 dark:text-status-error pt-2">{message}</p>
            ) : null}
            <input
              type="text"
              name="actionType"
              readOnly
              hidden
              value={ACTION_TYPE.AGENT_LOGS}
            />
            <SearchableHostList scanType="none" active={true} />
            <SearchableClusterList active={true} />
            <Button
              className="text-center mt-6 w-full"
              type="submit"
              disabled={fetcher.state !== 'idle'}
              loading={fetcher.state !== 'idle'}
            >
              Generate
            </Button>
          </fetcher.Form>
        </div>
      </SlidingModalContent>
    </SlidingModal>
  );
};

const AgentDiagnosticLogsComponent = () => {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      {showDialog ? (
        <AgentDiagnosticsLogsModal
          showDialog={showDialog}
          setShowDialog={setShowDialog}
        />
      ) : null}
      <Button variant="flat" onClick={() => setShowDialog(true)} className="w-fit">
        Generate agent diagnostic logs
      </Button>
    </>
  );
};
const DiagnosticLogs = () => {
  return (
    <div className="my-2">
      <div className="flex flex-col">
        <h6 className="text-h5 dark:text-text-input-value">Console diagnostic logs</h6>
        <div className="mt-2 flex flex-col gap-y-2">
          <ConsoleDiagnosticLogsComponent />
          <Suspense fallback={<TableSkeleton columns={4} rows={5} size={'compact'} />}>
            <ConsoleDiagnosticLogsTable />
          </Suspense>
        </div>
      </div>
      <div className="flex flex-col mt-8">
        <h6 className="text-h5 dark:text-text-input-value">Agent diagnostic logs</h6>
        <div className="mt-2 gap-y-2 flex flex-col ">
          <AgentDiagnosticLogsComponent />
          <Suspense fallback={<TableSkeleton columns={4} rows={5} size={'compact'} />}>
            <AgentDiagnosticLogsTable />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export const module = {
  element: <DiagnosticLogs />,
  action,
};
