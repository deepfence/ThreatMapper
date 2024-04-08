import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { ActionFunctionArgs, FetcherWithComponents, useFetcher } from 'react-router-dom';
import { useInterval } from 'react-use';
import { toast } from 'sonner';
import {
  Button,
  createColumnHelper,
  Listbox,
  ListboxOption,
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
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { PlusIcon } from '@/components/icons/common/Plus';
import { TruncatedText } from '@/components/TruncatedText';
import { SlidingModalHeaderWrapper } from '@/features/common/SlidingModalHeaderWrapper';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { getArrayTypeValuesFromFormData } from '@/utils/formData';

const DEFAULT_PAGE_SIZE = 10;
const ACTION_TYPE = {
  CONSOLE_LOGS: 'consoleLogs',
  AGENT_LOGS: 'agentLogs',
  CLOUD_SCANNER_LOGS: 'cloudScannerLogs',
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

  const nodeIds = getArrayTypeValuesFromFormData(formData, 'hostFilter');
  const clusterIds = getArrayTypeValuesFromFormData(formData, 'clusterFilter');
  const accountIds = getArrayTypeValuesFromFormData(formData, 'cloudAccountsFilter');

  if (!actionType) {
    return {
      success: false,
      message: 'You have not triggered any action',
    };
  }
  if (
    actionType === ACTION_TYPE.AGENT_LOGS ||
    actionType === ACTION_TYPE.CLOUD_SCANNER_LOGS
  ) {
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

    const clouds = accountIds.map((account) => {
      return {
        node_id: account,
        node_type: DiagnosisNodeIdentifierNodeTypeEnum.CloudAccount,
      };
    });

    const logsApi = apiWrapper({
      fn:
        actionType === ACTION_TYPE.CLOUD_SCANNER_LOGS
          ? getDiagnosisApiClient().generateCloudScannerDiagnosticLogs
          : getDiagnosisApiClient().generateAgentDiagnosticLogs,
    });

    const api =
      actionType === ACTION_TYPE.CLOUD_SCANNER_LOGS
        ? {
            diagnosisGenerateCloudScannerDiagnosticLogsRequest: {
              node_ids: [..._hosts, ..._clusters, ...clouds],
              tail: 10000,
            },
          }
        : {
            diagnosisGenerateAgentDiagnosticLogsRequest: {
              node_ids: [..._hosts, ..._clusters, ...clouds],
              tail: 10000,
            },
          };

    const logsResponse = await logsApi(api);

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
    invalidateAllQueries();
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
        const { message } = await getResponseErrors(logsResponse.error);
        toast.error(message);
        return null;
      } else if (logsResponse.error.response.status === 403) {
        const message = await get403Message(logsResponse.error);
        toast.error(message);
        return null;
      }
      throw logsResponse.error;
    }
    toast.success('Logs generated successfully');
    invalidateAllQueries();
  }

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
        header: () => 'Created at',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('message', {
        cell: (cell) => {
          if (!cell.row.original.message) {
            return 'Logs generated';
          }
          return cell.getValue();
        },
        header: () => 'Message',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('url_link', {
        cell: (cell) => {
          if (cell.row.original.url_link?.trim() === '') {
            return 'No logs';
          }
          return (
            <DFLink
              href={cell.row.original.url_link ?? ''}
              download
              target={'_blank'}
              className="flex items-center gap-x-1 text-accent-accent hover:text-bg-hover-1"
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
    return <p className="text-status-error text-p7">{message}</p>;
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
  const cloudScannerLogs = _logs?.cloud_scanner_logs ?? [];

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
        header: () => 'Created at',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('type', {
        cell: (cell) => cell.getValue(),
        header: () => 'Type',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('message', {
        cell: (cell) => {
          return <TruncatedText text={cell.getValue() ?? ''} />;
        },
        header: () => 'Message',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('url_link', {
        cell: (cell) => {
          if (cell.row.original.url_link?.trim() === '') {
            return 'No logs';
          }
          return (
            <DFLink
              href={cell.row.original.url_link}
              download
              target={'_blank'}
              className="flex items-center gap-x-1 text-accent-accent hover:text-bg-hover-1"
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
    return <p className="text-status-error text-p7">{message}</p>;
  }

  return (
    <>
      <Table
        size="default"
        data={[...agentLogs, ...cloudScannerLogs]}
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

const SelectCloudAccount = ({
  fetcher,
}: {
  fetcher: FetcherWithComponents<ActionData>;
}) => {
  const [cloud, setCloud] = useState('AWS');
  const [selectedCloudAccounts, setSelectedCloudAccounts] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-y-8">
      <Listbox
        variant="underline"
        value={cloud}
        name="cloud"
        onChange={(value) => {
          setCloud(value);
        }}
        placeholder="Select cloud type"
        label="Select Cloud Type"
        getDisplayValue={(value) => {
          return value?.toString() || '';
        }}
      >
        {['AWS', 'GCP', 'Azure']?.map((provider) => {
          return (
            <ListboxOption value={provider} key={provider}>
              {provider}
            </ListboxOption>
          );
        })}
      </Listbox>
      <SearchableCloudAccountsList
        active
        label={`${cloud} Account`}
        triggerVariant="select"
        defaultSelectedAccounts={selectedCloudAccounts}
        cloudProvider={cloud.toLowerCase() as 'aws' | 'gcp' | 'azure'}
        onClearAll={() => {
          setSelectedCloudAccounts([]);
        }}
        onChange={(value) => {
          setSelectedCloudAccounts(value);
        }}
        helperText={fetcher?.data?.fieldErrors?.node_ids}
        color={fetcher?.data?.fieldErrors?.node_ids ? 'error' : 'default'}
      />
    </div>
  );
};
const AgentDiagnosticsLogsModal = ({
  showDialog,
  setShowDialog,
  nodeType,
}: {
  showDialog: boolean;
  nodeType: 'host' | 'cluster' | 'cloud account';
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();
  const [hosts, setHosts] = useState<string[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);

  return (
    <SlidingModal size="s" open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <SlidingModalHeader>
        <SlidingModalHeaderWrapper>Agent diagnostic logs</SlidingModalHeaderWrapper>
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
                value={
                  nodeType === 'cloud account'
                    ? ACTION_TYPE.CLOUD_SCANNER_LOGS
                    : ACTION_TYPE.AGENT_LOGS
                }
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

              {nodeType === 'cloud account' && <SelectCloudAccount fetcher={fetcher} />}

              {fetcher?.data?.message ? (
                <p className="text-p7 text-status-error pt-2">{fetcher.data.message}</p>
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
  const [nodeType, setNodeType] = useState<'host' | 'cluster' | 'cloud account'>('host');
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
        <Button
          variant="flat"
          onClick={() => {
            setNodeType('cloud account');
            setShowDialog(true);
          }}
          className="w-fit"
          size="sm"
          startIcon={<PlusIcon />}
        >
          Generate cloud scanner diagnostic logs
        </Button>
      </div>
    </>
  );
};
const DiagnosticLogs = () => {
  return (
    <div className="my-2">
      <div className="flex flex-col" data-testid="consoleDiagnosticLogWrapperId">
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
      <div className="flex flex-col mt-8" data-testid="agentDiagnosticLogWrapperId">
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
