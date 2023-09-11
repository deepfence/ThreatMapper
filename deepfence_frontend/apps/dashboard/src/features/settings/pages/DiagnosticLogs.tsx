import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
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
  TableNoDataElement,
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
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { PlusIcon } from '@/components/icons/common/Plus';
import { TruncatedText } from '@/components/TruncatedText';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';

const DEFAULT_PAGE_SIZE = 10;
const ACTION_TYPE = {
  CONSOLE_LOGS: 'consoleLogs',
  AGENT_LOGS: 'agentLogs',
};

type ActionData = {
  success: boolean;
  message: string;
  fieldErrors?: {
    node_ids: string;
  };
} | null;

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
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

  if (!actionType) {
    return {
      success: false,
      message: 'You have not triggered any action',
    };
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
        const { message, fieldErrors } = await getResponseErrors(logsResponse.error);

        return {
          success: false,
          message,
          fieldErrors: {
            node_ids: fieldErrors?.node_ids ?? '',
          },
        };
      } else if (logsResponse.error.response.status === 403) {
        const message = await get403Message(logsResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw logsResponse.error;
    }
    return {
      success: true,
      message: '',
    };
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
        toast.error(logsResponse.error.message);
      } else if (logsResponse.error.response.status === 403) {
        const message = await get403Message(logsResponse.error);
        toast.error(message);
      }
      throw logsResponse.error;
    }
    toast.success('Logs generated successfully');
  }
  invalidateAllQueries();
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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('label', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
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
            <DFLink
              href={cell.row.original.url_link ?? ''}
              download
              target={'_blank'}
              className="flex items-center gap-x-1 dark:text-accent-accent dark:hover:text-bg-hover-1"
              unstyled
            >
              <span className="h-3 w-3">
                <DownloadLineIcon />
              </span>
              Download
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
    return <p className="dark:text-status-error text-p7">{message}</p>;
  }
  return (
    <Table
      size="default"
      data={consoleLogs}
      columns={columns}
      enablePagination
      pageSize={pageSize}
      enablePageResize
      onPageResize={(newSize) => {
        setPageSize(newSize);
      }}
      noDataElement={<TableNoDataElement text="No logs available" />}
    />
  );
};
const AgentDiagnosticLogsTable = () => {
  const columnHelper = createColumnHelper<DiagnosisDiagnosticLogsLink>();
  const { data } = useGetLogs();
  const { data: _logs, message } = data;
  const agentLogs = _logs?.agent_logs ?? [];

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('label', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
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
            <DFLink
              href={cell.row.original.url_link ?? ''}
              download
              target={'_blank'}
              className="flex items-center gap-x-1 dark:text-accent-accent dark:hover:text-bg-hover-1"
              unstyled
            >
              <span className="h-3 w-3">
                <DownloadLineIcon />
              </span>
              Download
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

  useInterval(() => {
    invalidateAllQueries();
  }, 20000);

  if (message) {
    return <p className="dark:text-status-error text-p7">{message}</p>;
  }

  return (
    <>
      <Table
        size="default"
        data={agentLogs}
        columns={columns}
        enablePagination
        pageSize={pageSize}
        enablePageResize
        onPageResize={(newSize) => {
          setPageSize(newSize);
        }}
        noDataElement={<TableNoDataElement text="No logs available" />}
      />
    </>
  );
};
const ConsoleDiagnosticLogsComponent = () => {
  const fetcher = useFetcher<string>();
  const { data } = useGetLogs();
  const { message } = data;
  if (message) {
    return null;
  }
  return (
    <fetcher.Form method="post">
      <input
        type="text"
        name="actionType"
        readOnly
        hidden
        value={ACTION_TYPE.CONSOLE_LOGS}
      />
      <Button
        variant="flat"
        size="sm"
        startIcon={<PlusIcon />}
        disabled={fetcher.state !== 'idle'}
        loading={fetcher.state !== 'idle'}
      >
        Generate console diagnostics logs
      </Button>
    </fetcher.Form>
  );
};

const AgentDiagnosticsLogsModal = ({
  showDialog,
  setShowDialog,
  nodeType,
}: {
  showDialog: boolean;
  nodeType: 'host' | 'cluster';
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();
  const [hosts, setHosts] = useState<string[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);

  return (
    <SlidingModal size="s" open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <SlidingModalHeader>
        <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-breadcrumb-bar">
          Agent diagnostic logs
        </div>
      </SlidingModalHeader>
      <SlidingModalCloseButton />
      <SlidingModalContent>
        {fetcher?.data?.success ? (
          <SuccessModalContent text="Logs generated successfully" />
        ) : (
          <div className="m-4">
            <span className="text-sm text-gray-500 dark:text-gray-300">
              Generate a link to download pdf for your {nodeType} agent
            </span>
            <fetcher.Form method="post" className="mt-4 flex flex-col gap-y-3">
              <input
                type="text"
                name="actionType"
                readOnly
                hidden
                value={ACTION_TYPE.AGENT_LOGS}
              />
              {nodeType === 'host' && (
                <SearchableHostList
                  scanType="none"
                  active={true}
                  triggerVariant="select"
                  defaultSelectedHosts={hosts}
                  onChange={(value) => {
                    setHosts(value);
                  }}
                  onClearAll={() => {
                    setHosts([]);
                  }}
                  helperText={fetcher?.data?.fieldErrors?.node_ids}
                  color={fetcher?.data?.fieldErrors?.node_ids ? 'error' : 'default'}
                />
              )}
              {nodeType === 'cluster' && (
                <SearchableClusterList
                  active={true}
                  triggerVariant="select"
                  defaultSelectedClusters={clusters}
                  onChange={(value) => {
                    setClusters(value);
                  }}
                  onClearAll={() => {
                    setClusters([]);
                  }}
                  helperText={fetcher?.data?.fieldErrors?.node_ids}
                  color={fetcher?.data?.fieldErrors?.node_ids ? 'error' : 'default'}
                />
              )}

              {fetcher?.data?.message ? (
                <p className="text-p7 dark:text-status-error pt-2">
                  {fetcher.data.message}
                </p>
              ) : null}

              <div className="flex gap-x-2 mt-8">
                <Button
                  type="submit"
                  disabled={fetcher.state !== 'idle'}
                  loading={fetcher.state !== 'idle'}
                >
                  Generate
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </fetcher.Form>
          </div>
        )}
      </SlidingModalContent>
    </SlidingModal>
  );
};

const AgentDiagnosticLogsComponent = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [nodeType, setNodeType] = useState<'host' | 'cluster'>('host');
  const { data } = useGetLogs();
  const { message } = data;
  if (message) {
    return null;
  }
  return (
    <>
      {showDialog ? (
        <AgentDiagnosticsLogsModal
          showDialog={showDialog}
          setShowDialog={setShowDialog}
          nodeType={nodeType}
        />
      ) : null}
      <div className="flex">
        <Button
          variant="flat"
          onClick={() => {
            setNodeType('host');
            setShowDialog(true);
          }}
          className="w-fit"
          size="sm"
          startIcon={<PlusIcon />}
        >
          Generate host agent diagnostic logs
        </Button>
        <Button
          variant="flat"
          onClick={() => {
            setNodeType('cluster');
            setShowDialog(true);
          }}
          className="w-fit"
          size="sm"
          startIcon={<PlusIcon />}
        >
          Generate cluster agent diagnostic logs
        </Button>
      </div>
    </>
  );
};
const DiagnosticLogs = () => {
  return (
    <div className="my-2">
      <div className="flex flex-col">
        <h6 className="text-h5 dark:text-text-input-value">Console diagnostic logs</h6>
        <div className="mt-2 flex flex-col gap-y-2">
          <Suspense
            fallback={
              <TableSkeleton columns={4} rows={DEFAULT_PAGE_SIZE} size={'default'} />
            }
          >
            <ConsoleDiagnosticLogsComponent />
            <ConsoleDiagnosticLogsTable />
          </Suspense>
        </div>
      </div>
      <div className="flex flex-col mt-8">
        <h6 className="text-h5 dark:text-text-input-value">Agent diagnostic logs</h6>
        <div className="mt-2 gap-y-2 flex flex-col">
          <Suspense
            fallback={
              <TableSkeleton columns={4} rows={DEFAULT_PAGE_SIZE} size={'default'} />
            }
          >
            <AgentDiagnosticLogsComponent />
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
