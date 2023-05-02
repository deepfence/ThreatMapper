import cx from 'classnames';
import { Suspense, useMemo, useRef, useState } from 'react';
import { FaPlay, FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { HiChevronRight } from 'react-icons/hi';
import {
  Form,
  generatePath,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Checkbox,
  createColumnHelper,
  getRowSelectionColumn,
  IconButton,
  Popover,
  RowSelectionState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getCloudNodesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelCloudNodeAccountInfo } from '@/api/generated';
import { ConfigureScanModal } from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterHeader } from '@/components/forms/FilterHeader';
import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';
import { CLOUDS } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { providersToNameMapping } from '@/features/postures/pages/Posture';
import { ComplianceScanNodeTypeEnum, ScanTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { getPageFromSearchParams } from '@/utils/table';
import { usePageNavigation } from '@/utils/usePageNavigation';

// TODO: remove this once we have correct type from api
export const getNodeTypeByProviderName = (
  providerName: string,
): ComplianceScanNodeTypeEnum | undefined => {
  switch (providerName) {
    case 'linux':
    case 'host':
      return ComplianceScanNodeTypeEnum.host;
    case 'aws':
      return ComplianceScanNodeTypeEnum.aws;
    case 'gcp':
      return ComplianceScanNodeTypeEnum.gcp;
    case 'azure':
      return ComplianceScanNodeTypeEnum.azure;
    case 'kubernetes':
      return ComplianceScanNodeTypeEnum.kubernetes_cluster;
    default:
      return;
  }
};

export interface AccountData {
  id: string;
  accountType: string;
  scanStatus: string;
  active?: boolean;
  compliancePercentage?: number;
}

type LoaderDataType = {
  error?: string;
  message?: string;
  data?: Awaited<ReturnType<typeof getAccounts>>;
};

const PAGE_SIZE = 15;

const getActiveStatus = (searchParams: URLSearchParams) => {
  return searchParams.getAll('active');
};

export async function getAccounts(
  nodeType: string,
  searchParams: URLSearchParams,
): Promise<{
  accounts: ModelCloudNodeAccountInfo[];
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const active = getActiveStatus(searchParams);
  const page = getPageFromSearchParams(searchParams);
  // const scanResultsReq: ListCloudNodeAccountRequest = {
  //   cloud_provider: '',
  //   window: {
  //     offset: page * PAGE_SIZE,
  //     size: PAGE_SIZE,
  //   },
  // };
  // if (active.length && !active.length) {
  //   scanResultsReq.fields_filter.contains_filter.filter_in!['active'] = [
  //     active.length ? true : false,
  //   ];
  // }
  const result = await makeRequest({
    apiFunction: getCloudNodesApiClient().listCloudNodeAccount,
    apiArgs: [
      {
        modelCloudNodeAccountsListReq: {
          cloud_provider: nodeType,
          window: {
            offset: 0 * PAGE_SIZE,
            size: PAGE_SIZE,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<LoaderDataType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  return {
    accounts: result.cloud_node_accounts_info ?? [],
    currentPage: 0,
    totalRows: 15,
  };
}

const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const searchParams = new URL(request.url).searchParams;
  const nodeType = params.nodeType;

  if (!nodeType) {
    throw new Error('Cloud Node Type is required');
  }
  return typedDefer({
    data: getAccounts(nodeType, searchParams),
  });
};

const PostureTable = ({ data }: { data: LoaderDataType['data'] }) => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const columnHelper = createColumnHelper<ModelCloudNodeAccountInfo>();
  const [selectedScanType, setSelectedScanType] = useState<
    typeof ScanTypeEnum.ComplianceScan | typeof ScanTypeEnum.CloudComplianceScan
  >();
  const [scanNodeIds, setScanNodeIds] = useState<string[]>();

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 30,
        size: 30,
        maxSize: 30,
        header: () => null,
      }),
      columnHelper.accessor('node_name', {
        cell: (cell) => {
          const isNeverScan = cell.row.original.last_scan_status?.toLowerCase() === '';
          const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
            let path = '/posture/scan-results/:nodeType/:scanId';

            if (
              cell.row.original.cloud_provider &&
              CLOUDS.includes(
                cell.row.original.cloud_provider as ComplianceScanNodeTypeEnum,
              )
            ) {
              path = '/posture/cloud/scan-results/:nodeType/:scanId';
            }
            const redirectUrl = generatePath(`${path}`, {
              scanId: cell.row.original.last_scan_id ?? '',
              nodeType: cell.row.original.cloud_provider ?? '',
            });
            return isNeverScan ? (
              <span>{children}</span>
            ) : (
              <DFLink to={redirectUrl}>{children}</DFLink>
            );
          };
          return (
            <WrapperComponent>
              <div className="flex items-center gap-x-2 truncate">
                <span className="truncate capitalize">{cell.getValue()}</span>
              </div>
            </WrapperComponent>
          );
        },
        header: () => 'Account',
        minSize: 100,
        size: 120,
        maxSize: 130,
      }),
      columnHelper.accessor('compliance_percentage', {
        minSize: 80,
        size: 80,
        maxSize: 100,
        header: () => 'Compliance %',
        cell: (cell) => {
          const percent = Number(cell.getValue()) ?? 0;
          return (
            <div
              className={cx('text-md rounded-lg font-medium text-center w-fit px-2', {
                'bg-[#de425b]/30 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                  percent > 60 && percent < 100,
                'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                  percent > 30 && percent < 90,
                'bg-[#0E9F6E]/20 dark:bg-[#0E9F6E]/20 text-[#0E9F6E] dark:text-[#0E9F6E]':
                  percent !== 0 && percent < 30,
                'text-gray-700 dark:text-gray-400': !percent,
              })}
            >
              {percent.toFixed(2)}%
            </div>
          );
        },
      }),
      columnHelper.accessor('active', {
        minSize: 40,
        size: 40,
        maxSize: 40,
        header: () => 'Active',
        cell: (info) => {
          return info.getValue() ? 'Yes' : 'No';
        },
      }),
      columnHelper.accessor('last_scan_status', {
        cell: (info) => {
          const value = info.getValue();
          const isNeverScan = info.row.original.last_scan_status?.toLowerCase() === '';
          const isScanning =
            value?.toLowerCase() !== 'complete' &&
            value?.toLowerCase() !== 'error' &&
            !isNeverScan;
          const status = isNeverScan ? 'NEVER SCANNED' : value?.toUpperCase();
          return (
            <Badge
              label={status}
              className={cx('text-md rounded-lg font-medium text-center w-fit px-2', {
                'bg-[#0E9F6E]/20 dark:bg-[#0E9F6E]/20 text-[#0E9F6E] dark:text-[#0E9F6E]':
                  value?.toLowerCase() === 'complete',
                'bg-[#de425b]/30 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                  value?.toLowerCase() === 'error',
                'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                  isScanning,
              })}
              size="sm"
            />
          );
        },
        header: () => 'Status',
        minSize: 50,
        size: 70,
        maxSize: 80,
      }),
      columnHelper.display({
        id: 'startScan',
        enableSorting: false,
        cell: (info) => (
          <Button
            size="xs"
            color="normal"
            startIcon={<FaPlay />}
            className="text-blue-600 dark:text-blue-500"
            onClick={() => {
              if (!info.row.original.node_id) {
                throw new Error('Node id is required to start scan');
              }
              const scanType = CLOUDS.includes(
                info.row.original.cloud_provider as ComplianceScanNodeTypeEnum,
              )
                ? ScanTypeEnum.CloudComplianceScan
                : ScanTypeEnum.ComplianceScan;
              setSelectedScanType(scanType);
              setScanNodeIds([info.row.original.node_id]);
            }}
          >
            Start Scan
          </Button>
        ),
        header: () => 'Start action',
        minSize: 80,
        size: 100,
        maxSize: 120,
      }),
    ],
    [rowSelectionState, searchParams, data],
  );
  const accounts = data?.accounts ?? [];
  const totalRows = data?.totalRows ?? 0;
  const currentPage = data?.currentPage ?? 0;
  const cloudProvider = accounts[0]?.cloud_provider ?? '';

  const nodeType = getNodeTypeByProviderName(cloudProvider);
  return (
    <>
      <div>
        <ConfigureScanModal
          open={!!selectedScanType}
          onOpenChange={() => setSelectedScanType(undefined)}
          scanOptions={
            selectedScanType && nodeType
              ? {
                  showAdvancedOptions: true,
                  scanType: CLOUDS.includes(cloudProvider as ComplianceScanNodeTypeEnum)
                    ? ScanTypeEnum.CloudComplianceScan
                    : ScanTypeEnum.ComplianceScan,
                  data: {
                    nodeIds: scanNodeIds ?? [],
                    nodeType: nodeType,
                  },
                }
              : undefined
          }
        />
        <Form>
          {Object.keys(rowSelectionState).length === 0 ? (
            <>
              {accounts.length > 0 && (
                <div className="text-sm text-gray-400 font-medium pt-2 pb-1 flex justify-between">
                  No rows selected
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-1.5 flex gap-x-2">
                <Button
                  size="xxs"
                  color="primary"
                  outline
                  onClick={() => {
                    const scanType = CLOUDS.includes(
                      cloudProvider as ComplianceScanNodeTypeEnum,
                    )
                      ? ScanTypeEnum.CloudComplianceScan
                      : ScanTypeEnum.ComplianceScan;
                    setSelectedScanType(scanType);
                    setScanNodeIds(Object.keys(rowSelectionState));
                  }}
                >
                  Start Scan
                </Button>
              </div>
            </>
          )}
        </Form>
        <Table
          size="sm"
          data={accounts ?? []}
          columns={columns}
          enableRowSelection
          enablePagination
          totalRows={totalRows}
          pageSize={30}
          rowSelectionState={rowSelectionState}
          onRowSelectionChange={setRowSelectionState}
          getRowId={(row) => row.node_id ?? ''}
        />
      </div>
    </>
  );
};

const Accounts = () => {
  const elementToFocusOnClose = useRef(null);
  const loaderData = useLoaderData() as LoaderDataType;
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams() as {
    nodeType: string;
  };
  const { navigate } = usePageNavigation();
  const isFilterApplied = searchParams.has('');

  const onResetFilters = () => {
    setSearchParams(() => {
      return {};
    });
  };

  return (
    <div>
      <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <DFLink to={'/posture'}>Posture</DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">
              {providersToNameMapping[routeParams.nodeType]}
            </span>
          </BreadcrumbLink>
        </Breadcrumb>
        <div className="ml-auto flex relative gap-x-4">
          <div className="ml-auto">
            <Button
              size="xs"
              startIcon={<FaPlus />}
              color="primary"
              outline
              onClick={() => {
                navigate(`/posture/add-connection/${routeParams.nodeType}`);
              }}
            >
              Add {routeParams.nodeType === ACCOUNT_CONNECTOR.KUBERNETES && 'Cluster'}
              {routeParams.nodeType === ACCOUNT_CONNECTOR.LINUX && 'Host'}
              {routeParams.nodeType !== ACCOUNT_CONNECTOR.KUBERNETES &&
                routeParams.nodeType !== ACCOUNT_CONNECTOR.LINUX &&
                'Account'}
            </Button>
          </div>
          <div>
            {isFilterApplied && (
              <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
            )}

            <Popover
              triggerAsChild
              elementToFocusOnCloseRef={elementToFocusOnClose}
              content={
                <div className="dark:text-white w-[300px]">
                  <FilterHeader onReset={onResetFilters} />
                  <div className="flex flex-col gap-y-6 p-4">
                    <fieldset>
                      <legend className="text-sm font-medium">Active</legend>
                      <div className="flex gap-x-4 mt-1">
                        <Checkbox
                          label="No"
                          checked={searchParams.getAll('active').includes('true')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('active', 'true');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('active');
                                prev.delete('active');
                                prevStatuses
                                  .filter((active) => active !== 'true')
                                  .forEach((active) => {
                                    prev.append('active', active);
                                  });
                                prev.delete('active');
                                prev.delete('page');
                                return prev;
                              });
                            }
                          }}
                        />
                        <Checkbox
                          label="Yes"
                          checked={searchParams.getAll('active').includes('false')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('active', 'false');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('false');
                                prev.delete('active');
                                prevStatuses
                                  .filter((active) => active !== 'false')
                                  .forEach((active) => {
                                    prev.append('active', active);
                                  });
                                prev.delete('active');
                                prev.delete('page');
                                return prev;
                              });
                            }
                          }}
                        />
                      </div>
                    </fieldset>
                  </div>
                </div>
              }
            >
              <IconButton
                size="xs"
                outline
                color="primary"
                className="rounded-lg bg-transparent"
                icon={<FiFilter />}
              />
            </Popover>
          </div>
        </div>
      </div>

      <div className="px-1 mt-2">
        <Suspense fallback={<TableSkeleton columns={6} rows={10} size={'md'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType['data']) => {
              return <PostureTable data={resolvedData} />;
            }}
          </DFAwait>
        </Suspense>
      </div>
    </div>
  );
};

export const module = {
  loader,
  element: <Accounts />,
};
