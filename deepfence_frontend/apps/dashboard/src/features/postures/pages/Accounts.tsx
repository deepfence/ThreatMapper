import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { capitalize, startCase, upperFirst } from 'lodash-es';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  generatePath,
  useFetcher,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from 'tailwind-preset';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  CircleSpinner,
  ColumnDef,
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerButton,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  Modal,
  RowSelectionState,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
  Tabs,
  Tooltip,
} from 'ui-components';

import { getCloudNodesApiClient, getScanResultsApiClient } from '@/api/api';
import {
  ModelBulkDeleteScansRequestScanTypeEnum,
  ModelCloudNodeAccountInfo,
  ModelCloudNodeAccountsListReqCloudProviderEnum,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { ConfigureScanModal } from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableCloudAccountName } from '@/components/forms/SearchableCloudAccountName';
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { ArrowUpCircleLine } from '@/components/icons/common/ArrowUpCircleLine';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { FilterIcon } from '@/components/icons/common/Filter';
import { PlusIcon } from '@/components/icons/common/Plus';
import { RefreshIcon } from '@/components/icons/common/Refresh';
import { TimesIcon } from '@/components/icons/common/Times';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { ComplianceScanConfigureFormProps } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { StopScanForm } from '@/components/scan-configure-forms/StopScanForm';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { TruncatedText } from '@/components/TruncatedText';
import { getColorForCompliancePercent } from '@/constants/charts';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { providersToNameMapping } from '@/features/postures/pages/Posture';
import {
  getDeleteConfirmationDisplayName,
  getDisplayNameOfNodeType,
  getSearchableCloudAccountDisplayName,
  isCloudNonOrgNode,
  isCloudOrgNode,
  isKubernetesNodeType,
  isLinuxNodeType,
  isNonCloudNode,
} from '@/features/postures/utils';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import {
  CloudNodeNonOrgType,
  CloudNodeType,
  ComplianceScanNodeTypeEnum,
  ScanTypeEnum,
} from '@/types/common';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatPercentage } from '@/utils/number';
import {
  isNeverScanned,
  isScanComplete,
  isScanDeletePending,
  isScanInProgress,
  isScanStopping,
  SCAN_STATUS_FILTER,
  SCAN_STATUS_FILTER_TYPE,
} from '@/utils/scan';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';
import { usePageNavigation } from '@/utils/usePageNavigation';
import { isUpgradeAvailable } from '@/utils/version';

enum ActionEnumType {
  DELETE_SCAN = 'delete_scan',
  REFRESH_ACCOUNT = 'refresh_account',
  DELETE_ACCOUNT = 'delete_account',
  START_SCAN = 'start_scan',
  CANCEL_SCAN = 'cancel_scan',
}

const getNodeTypeByProviderName = (providerName: string): ComplianceScanNodeTypeEnum => {
  switch (providerName) {
    case 'linux':
    case 'host':
      return ComplianceScanNodeTypeEnum.host;
    case 'aws':
      return ComplianceScanNodeTypeEnum.aws;
    case 'aws_org':
      return ComplianceScanNodeTypeEnum.aws_org;
    case 'gcp':
      return ComplianceScanNodeTypeEnum.gcp;
    case 'gcp_org':
      return ComplianceScanNodeTypeEnum.gcp_org;
    case 'azure':
      return ComplianceScanNodeTypeEnum.azure;
    case 'azure_org':
      return ComplianceScanNodeTypeEnum.azure_org;
    case 'kubernetes':
      return ComplianceScanNodeTypeEnum.kubernetes_cluster;
    default:
      throw new Error('No matching provider name found');
  }
};

export interface AccountData {
  id: string;
  accountType: string;
  scanStatus: string;
  active?: boolean;
  compliancePercentage?: number;
}

const DEFAULT_PAGE_SIZE = 10;

const action = async ({
  request,
}: ActionFunctionArgs): Promise<{
  success?: boolean;
  message?: string;
  action?: ActionEnumType;
} | null> => {
  const formData = await request.formData();
  const actionType = formData.get('actionType');
  const scanIds = formData.getAll('scanId');
  const accountIds = formData.getAll('accountId[]') as string[];
  const scanType = formData.get('scanType') as ModelBulkDeleteScansRequestScanTypeEnum;
  if (!actionType) {
    throw new Error('Invalid action');
  }

  if (actionType === ActionEnumType.DELETE_SCAN) {
    if (scanIds.length === 0) {
      throw new Error('Scan ids are required for deletion');
    }
    const deleteScanResultsForScanIDApi = apiWrapper({
      fn: getScanResultsApiClient().bulkDeleteScans,
    });
    const result = await deleteScanResultsForScanIDApi({
      modelBulkDeleteScansRequest: {
        filters: {
          compare_filter: null,
          contains_filter: {
            filter_in: {
              node_id: scanIds,
            },
          },
          order_filter: { order_fields: [] },
          match_filter: { filter_in: {} },
        },
        scan_type: scanType,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        const { message } = await getResponseErrors(result.error);
        return {
          success: false,
          action: ActionEnumType.DELETE_SCAN,
          message,
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          success: false,
          message,
          action: ActionEnumType.DELETE_SCAN,
        };
      }
      throw result.error;
    }
  } else if (actionType === ActionEnumType.REFRESH_ACCOUNT) {
    const refreshCloudNodeAccountApi = apiWrapper({
      fn: getCloudNodesApiClient().refreshCloudNodeAccount,
    });
    const refreshAccountRresult = await refreshCloudNodeAccountApi({
      modelCloudAccountRefreshReq: {
        node_ids: accountIds,
      },
    });
    if (!refreshAccountRresult.ok) {
      if (refreshAccountRresult.error.response.status === 400) {
        const { message } = await getResponseErrors(refreshAccountRresult.error);
        return {
          success: false,
          message,
          action: ActionEnumType.REFRESH_ACCOUNT,
        };
      } else if (refreshAccountRresult.error.response.status === 403) {
        const message = await get403Message(refreshAccountRresult.error);
        return {
          message,
          success: false,
          action: ActionEnumType.REFRESH_ACCOUNT,
        };
      }
      throw refreshAccountRresult.error;
    }
  } else if (actionType === ActionEnumType.DELETE_ACCOUNT) {
    const deleteCloudNodeAccountApi = apiWrapper({
      fn: getCloudNodesApiClient().deleteCloudNodeAccount,
    });
    const deleteAccountRresult = await deleteCloudNodeAccountApi({
      modelCloudAccountDeleteReq: {
        node_ids: accountIds,
      },
    });
    if (!deleteAccountRresult.ok) {
      if (deleteAccountRresult.error.response.status === 400) {
        const { message } = await getResponseErrors(deleteAccountRresult.error);
        return {
          success: false,
          message,
          action: ActionEnumType.DELETE_ACCOUNT,
        };
      } else if (deleteAccountRresult.error.response.status === 403) {
        const message = await get403Message(deleteAccountRresult.error);
        return {
          message,
          success: false,
          action: ActionEnumType.DELETE_ACCOUNT,
        };
      }
      throw deleteAccountRresult.error;
    }
  }
  invalidateAllQueries();
  return {
    success: true,
    action: actionType as ActionEnumType,
  };
};

const usePostureAccounts = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const nodeType = params?.nodeType ?? '';
  return useSuspenseQuery({
    ...queries.posture.postureAccounts({
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams),
      status: searchParams.getAll('status'),
      complianceScanStatus: searchParams.get('complianceScanStatus') as
        | SCAN_STATUS_FILTER_TYPE
        | undefined,
      nodeType,
      org_accounts: searchParams.getAll('org_accounts'),
      aws_accounts: searchParams.getAll('aws_accounts'),
      gcp_accounts: searchParams.getAll('gcp_accounts'),
      azure_accounts: searchParams.getAll('azure_accounts'),
      accountNames: searchParams.getAll('accountNames'),
      hosts: searchParams.getAll('hosts'),
      clusters: searchParams.getAll('clusters'),
    }),
    keepPreviousData: true,
  });
};

enum FILTER_SEARCHPARAMS_KEYS_ENUM {
  complianceScanStatus = 'complianceScanStatus',
  status = 'status',
  org_accounts = 'org_accounts',
  aws_accounts = 'aws_accounts',
  gcp_accounts = 'gcp_accounts',
  azure_accounts = 'azure_accounts',
  hosts = 'hosts',
  clusters = 'clusters',
  accountNames = 'accountNames',
}

const FILTER_SEARCHPARAMS_DYNAMIC_KEYS = [
  FILTER_SEARCHPARAMS_KEYS_ENUM.hosts,
  FILTER_SEARCHPARAMS_KEYS_ENUM.clusters,
];

const FILTER_SEARCHPARAMS: Record<FILTER_SEARCHPARAMS_KEYS_ENUM, string> = {
  complianceScanStatus: 'Posture scan status',
  status: 'Status',
  org_accounts: 'Organization account',
  aws_accounts: 'Account',
  gcp_accounts: 'Project',
  azure_accounts: 'Subscription',
  hosts: 'Account',
  clusters: 'Account',
  accountNames: 'Name',
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const getPrettyNameForAppliedFilters = ({
  key,
  value,
}: {
  key: string;
  value: string;
}) => {
  switch (key) {
    case 'status':
      return startCase(value);

    default:
      return value;
  }
};
const Filters = () => {
  const { nodeType } = useParams() as {
    nodeType: string;
  };
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState('');
  const [complianceScanStatusSearchText, setComplianceScanStatusSearchText] =
    useState('');

  const onFilterRemove = ({ key, value }: { key: string; value: string }) => {
    return () => {
      setSearchParams((prev) => {
        const existingValues = prev.getAll(key);
        prev.delete(key);
        existingValues.forEach((existingValue) => {
          if (existingValue !== value) prev.append(key, existingValue);
        });
        prev.delete('page');
        return prev;
      });
    };
  };

  const appliedFilterCount = getAppliedFiltersCount(searchParams);

  return (
    <FilterWrapper>
      <div className="flex gap-2">
        <ComboboxV2Provider
          selectedValue={searchParams.getAll('status')}
          setSelectedValue={(values) => {
            setSearchParams((prev) => {
              prev.delete('status');
              values.forEach((value) => {
                prev.append('status', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          setValue={(query) => {
            setStatus(query);
          }}
        >
          <ComboboxV2TriggerButton>
            {FILTER_SEARCHPARAMS['status']}
          </ComboboxV2TriggerButton>
          <ComboboxV2Content width="fixed" clearButtonContent="Clear">
            {['active', 'inactive']
              .filter((item) => {
                if (!status.length) return true;
                return item.includes(status.toLowerCase());
              })
              .map((item) => {
                return (
                  <ComboboxV2Item key={item} value={item}>
                    {capitalize(item)}
                  </ComboboxV2Item>
                );
              })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
        <ComboboxV2Provider
          selectedValue={searchParams.get('complianceScanStatus') ?? ''}
          setValue={(query) => {
            setComplianceScanStatusSearchText(query);
          }}
          setSelectedValue={(value) => {
            setSearchParams((prev) => {
              if (value) {
                prev.set('complianceScanStatus', value);
              } else {
                prev.delete('complianceScanStatus');
              }
              prev.delete('page');
              return prev;
            });
          }}
        >
          <ComboboxV2TriggerButton>
            {FILTER_SEARCHPARAMS['complianceScanStatus']}
          </ComboboxV2TriggerButton>
          <ComboboxV2Content width="fixed">
            {Object.keys(SCAN_STATUS_FILTER)
              .filter((item) => {
                if (!complianceScanStatusSearchText.length) return true;
                return item
                  .toLowerCase()
                  .includes(complianceScanStatusSearchText.toLowerCase());
              })
              .map((item) => {
                return (
                  <ComboboxV2Item key={item} value={item}>
                    {item}
                  </ComboboxV2Item>
                );
              })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
        {isCloudNonOrgNode(nodeType) ? (
          <>
            <SearchableCloudAccountsList
              displayValue={getSearchableCloudAccountDisplayName(
                `${nodeType}_org` as ModelCloudNodeAccountsListReqCloudProviderEnum,
              )}
              valueKey="nodeId"
              cloudProvider={`${nodeType}_org` as CloudNodeType}
              defaultSelectedAccounts={searchParams.getAll('org_accounts')}
              onChange={(value) => {
                setSearchParams((prev) => {
                  prev.delete('org_accounts');
                  value.forEach((id) => {
                    prev.append('org_accounts', id);
                  });
                  prev.delete('page');
                  return prev;
                });
              }}
            />
            <SearchableCloudAccountsList
              cloudProvider={nodeType as CloudNodeType}
              displayValue={
                FILTER_SEARCHPARAMS[`${nodeType as CloudNodeNonOrgType}_accounts`]
              }
              defaultSelectedAccounts={searchParams.getAll(`${nodeType}_accounts`)}
              onChange={(value) => {
                setSearchParams((prev) => {
                  prev.delete(`${nodeType}_accounts`);
                  value.forEach((id) => {
                    prev.append(`${nodeType}_accounts`, id);
                  });
                  prev.delete('page');
                  return prev;
                });
              }}
            />
            <SearchableCloudAccountName
              cloudProvider={nodeType as CloudNodeType}
              defaultSelectedAccounts={searchParams.getAll('accountNames')}
              onChange={(values) => {
                setSearchParams((prev) => {
                  prev.delete('accountNames');
                  values.forEach((value) => {
                    prev.append('accountNames', value);
                  });
                  prev.delete('page');
                  return prev;
                });
              }}
            />
          </>
        ) : null}

        {isLinuxNodeType(nodeType) ? (
          <SearchableHostList
            scanType={'none'}
            displayValue={FILTER_SEARCHPARAMS['hosts']}
            defaultSelectedHosts={searchParams.getAll('hosts')}
            onChange={(value) => {
              setSearchParams((prev) => {
                prev.delete('hosts');
                value.forEach((host) => {
                  prev.append('hosts', host);
                });
                prev.delete('page');
                return prev;
              });
            }}
          />
        ) : null}
        {isKubernetesNodeType(nodeType) ? (
          <SearchableClusterList
            displayValue={FILTER_SEARCHPARAMS['clusters']}
            defaultSelectedClusters={searchParams.getAll('clusters')}
            onClearAll={() => {
              setSearchParams((prev) => {
                prev.delete('clusters');
                prev.delete('page');
                return prev;
              });
            }}
            onChange={(value) => {
              setSearchParams((prev) => {
                prev.delete('clusters');
                value.forEach((cluster) => {
                  prev.append('clusters', cluster);
                });
                prev.delete('page');
                return prev;
              });
            }}
          />
        ) : null}
      </div>
      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {(
            Array.from(searchParams).filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            }) as Array<[FILTER_SEARCHPARAMS_KEYS_ENUM, string]>
          ).map(([key, value]) => {
            if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.org_accounts) {
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  onRemove={onFilterRemove({ key, value })}
                  text={value}
                  label={getSearchableCloudAccountDisplayName(
                    `${nodeType}_org` as ModelCloudNodeAccountsListReqCloudProviderEnum,
                  )}
                />
              );
            }

            if (FILTER_SEARCHPARAMS_DYNAMIC_KEYS.includes(key)) {
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  nodeType={(() => {
                    if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.hosts) {
                      return 'host';
                    } else if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.clusters) {
                      return 'cluster';
                    }
                    throw new Error('unknown key');
                  })()}
                  onRemove={onFilterRemove({ key, value })}
                  id={value}
                  label={FILTER_SEARCHPARAMS[key]}
                />
              );
            }
            return (
              <FilterBadge
                key={`${key}-${value}`}
                onRemove={onFilterRemove({ key, value })}
                text={getPrettyNameForAppliedFilters({
                  key,
                  value,
                })}
                label={FILTER_SEARCHPARAMS[key]}
              />
            );
          })}
          <Button
            variant="flat"
            color="default"
            startIcon={<TimesIcon />}
            onClick={() => {
              setSearchParams((prev) => {
                Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                  prev.delete(key);
                });
                prev.delete('page');
                return prev;
              });
            }}
            size="sm"
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </FilterWrapper>
  );
};
const DeleteConfirmationModal = ({
  showDialog,
  scanIds,
  scanType,
  setShowDialog,
  onSuccess,
}: {
  showDialog: boolean;
  scanIds: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  scanType?: ModelBulkDeleteScansRequestScanTypeEnum;
  onSuccess: () => void;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      scanIds.forEach((scanId) => formData.append('scanId', scanId));
      formData.append('scanType', scanType ?? '');
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [scanIds, scanType, fetcher],
  );

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.success &&
      fetcher.data.action === ActionEnumType.DELETE_SCAN
    ) {
      onSuccess();
    }
  }, [fetcher]);

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
            Delete scan
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
                onDeleteAction(ActionEnumType.DELETE_SCAN);
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
          <span>The selected account scan will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};
const DeleteAccountConfirmationModal = ({
  showDialog,
  accountIds,
  setShowDialog,
  onSuccess,
}: {
  showDialog: boolean;
  accountIds: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess: () => void;
}) => {
  const fetcher = useFetcher();
  const params = useParams() as {
    nodeType: string;
  };

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      accountIds.forEach((accountId) => formData.append('accountId[]', accountId));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [accountIds, fetcher],
  );

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.success &&
      fetcher.data.action === ActionEnumType.DELETE_ACCOUNT
    ) {
      onSuccess();
    }
  }, [fetcher]);

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
            Delete{' '}
            {getDisplayNameOfNodeType(
              params.nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum,
            )}
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
                onDeleteAction(ActionEnumType.DELETE_ACCOUNT);
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
          <span>
            {getDeleteConfirmationDisplayName(
              params.nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum,
            )}
          </span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7a text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

const ActionDropdown = ({
  nodeType,
  scanType,
  trigger,
  row,
  onTableAction,
}: {
  trigger: React.ReactNode;
  nodeType?: string;
  scanType: ScanTypeEnum;
  row: ModelCloudNodeAccountInfo;
  onTableAction: (row: ModelCloudNodeAccountInfo, actionType: ActionEnumType) => void;
}) => {
  const fetcher = useFetcher();
  const { last_scan_id: scanId = '', last_scan_status: scanStatus = '', active } = row;
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { downloadScan } = useDownloadScan((state) => {
    setIsSubmitting(state === 'submitting');
  });

  const onDownloadAction = useCallback(() => {
    downloadScan({
      scanId,
      nodeType: (nodeType?.toString() === ComplianceScanNodeTypeEnum.kubernetes_cluster
        ? 'cluster'
        : nodeType) as UtilsReportFiltersNodeTypeEnum,
      scanType:
        (scanType as ScanTypeEnum) === ScanTypeEnum.CloudComplianceScan
          ? UtilsReportFiltersScanTypeEnum.CloudCompliance
          : UtilsReportFiltersScanTypeEnum.Compliance,
    });
  }, [scanId, nodeType, downloadScan, scanType]);

  useEffect(() => {
    if (fetcher.state === 'idle') setOpen(false);
  }, [fetcher]);

  if (!nodeType) {
    throw new Error('Node type is required');
  }

  return (
    <>
      <Dropdown
        triggerAsChild
        align="start"
        open={open}
        onOpenChange={setOpen}
        content={
          <>
            <DropdownItem
              disabled={
                !active ||
                isScanInProgress(scanStatus) ||
                isScanStopping(scanStatus) ||
                isScanDeletePending(scanStatus)
              }
              onSelect={() => {
                onTableAction(row, ActionEnumType.START_SCAN);
              }}
            >
              Start scan
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                onTableAction(row, ActionEnumType.CANCEL_SCAN);
              }}
              disabled={!isScanInProgress(scanStatus) || isScanDeletePending(scanStatus)}
            >
              <span className="flex items-center">Cancel scan</span>
            </DropdownItem>
            <DropdownItem
              disabled={!isScanComplete(scanStatus) || isScanDeletePending(scanStatus)}
              onSelect={(e) => {
                if (!isScanComplete(scanStatus)) return;
                e.preventDefault();
                onDownloadAction();
              }}
            >
              <span className="flex text-center gap-x-2">
                {isSubmitting && <CircleSpinner size="sm" />} Download latest report
              </span>
            </DropdownItem>
            <DropdownItem
              disabled={
                !scanId ||
                !nodeType ||
                isScanInProgress(scanStatus) ||
                isNeverScanned(scanStatus) ||
                isScanDeletePending(scanStatus)
              }
              onSelect={() => {
                if (!scanId || !nodeType) return;
                onTableAction(row, ActionEnumType.DELETE_SCAN);
              }}
              color="error"
            >
              Delete latest scan
            </DropdownItem>

            {isCloudNode(nodeType) || isCloudOrgNode(nodeType) ? (
              <>
                <DropdownItem
                  onSelect={() => {
                    onTableAction(row, ActionEnumType.REFRESH_ACCOUNT);
                  }}
                >
                  Refresh{' '}
                  {getDisplayNameOfNodeType(
                    nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum,
                  ).toLowerCase()}
                </DropdownItem>
                <DropdownItem
                  disabled={isScanInProgress(scanStatus) || isScanStopping(scanStatus)}
                  onSelect={() => {
                    if (isScanInProgress(scanStatus) || isScanStopping(scanStatus)) {
                      return;
                    }
                    onTableAction(row, ActionEnumType.DELETE_ACCOUNT);
                  }}
                  color="error"
                >
                  Delete{' '}
                  {getDisplayNameOfNodeType(
                    nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum,
                  ).toLowerCase()}
                </DropdownItem>
              </>
            ) : null}
          </>
        }
      >
        {trigger}
      </Dropdown>
    </>
  );
};

const BulkActions = ({
  nodeType,
  selectedRows,
  onBulkAction,
}: {
  nodeType: ComplianceScanNodeTypeEnum;
  selectedRows: {
    scanId: string;
    nodeId: string;
    nodeType: string;
    active: boolean;
    scanStatus: string;
  }[];
  onBulkAction: (
    data: {
      scanIdsToCancelScan: string[];
      scanIdsToDeleteScan: string[];
      nodesToStartScan: ComplianceScanConfigureFormProps['data'] | null;
      nodesToDeleteScan: string[];
    },
    actionType: ActionEnumType,
  ) => void;
}) => {
  const { navigate } = usePageNavigation();
  const params = useParams();

  const scanIdsToDeleteScan = useMemo(() => {
    return selectedRows
      .filter(
        (row) =>
          !isNeverScanned(row.scanStatus) &&
          !isScanDeletePending(row.scanStatus) &&
          !isScanInProgress(row.scanStatus),
      )
      .map((row) => row.scanId);
  }, [selectedRows]);

  const nodeIdsToScan = useMemo(() => {
    return selectedRows
      .filter(
        (node) =>
          node.active &&
          !isScanInProgress(node.scanStatus) &&
          !isScanStopping(node.scanStatus) &&
          !isScanDeletePending(node.scanStatus),
      )
      .map((node) => node.nodeId);
  }, [selectedRows]);

  const scanIdsToCancelScan = useMemo(() => {
    return selectedRows
      .filter(
        (row) => isScanInProgress(row.scanStatus) && !isScanDeletePending(row.scanStatus),
      )
      .map((row) => row.scanId);
  }, [selectedRows]);

  const nodeIdsToDelete = useMemo(() => {
    return selectedRows
      .filter(
        (row) => !(isScanInProgress(row.scanStatus) || isScanStopping(row.scanStatus)),
      )
      .map((row) => row.nodeId);
  }, [selectedRows]);

  return (
    <>
      <Button
        color="default"
        variant="flat"
        size="sm"
        startIcon={<PlusIcon />}
        onClick={() => {
          if (!params?.nodeType) {
            toast.error('Provide correct posture account');
            return;
          }
          navigate(
            generatePath('/posture/add-connection/:account', {
              account: encodeURIComponent(params.nodeType ?? ''),
            }),
          );
        }}
      >
        ADD NEW{' '}
        {getDisplayNameOfNodeType(
          nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum,
        ).toUpperCase()}
      </Button>
      <Button
        color="default"
        variant="flat"
        size="sm"
        disabled={nodeIdsToScan.length == 0}
        onClick={() =>
          onBulkAction(
            {
              scanIdsToCancelScan: [],
              scanIdsToDeleteScan: [],
              nodesToStartScan: {
                nodeIds: nodeIdsToScan,
                nodeType,
              },
              nodesToDeleteScan: [],
            },
            ActionEnumType.START_SCAN,
          )
        }
      >
        Start scan
      </Button>
      <Button
        color="default"
        variant="flat"
        size="sm"
        disabled={scanIdsToCancelScan.length === 0}
        onClick={() =>
          onBulkAction(
            {
              scanIdsToCancelScan,
              scanIdsToDeleteScan: [],
              nodesToStartScan: null,
              nodesToDeleteScan: [],
            },
            ActionEnumType.CANCEL_SCAN,
          )
        }
      >
        Cancel scan
      </Button>
      <Button
        color="error"
        variant="flat"
        startIcon={<TrashLineIcon />}
        size="sm"
        disabled={scanIdsToDeleteScan.length === 0}
        onClick={() =>
          onBulkAction(
            {
              scanIdsToCancelScan: [],
              scanIdsToDeleteScan,
              nodesToStartScan: null,
              nodesToDeleteScan: [],
            },
            ActionEnumType.DELETE_SCAN,
          )
        }
      >
        Delete scan
      </Button>
      {isCloudNode(nodeType) || isCloudOrgNode(nodeType) ? (
        <>
          <Button
            variant="flat"
            startIcon={<RefreshIcon />}
            size="sm"
            disabled={selectedRows.length === 0}
            onClick={() =>
              onBulkAction(
                {
                  scanIdsToCancelScan: [],
                  scanIdsToDeleteScan: [],
                  nodesToStartScan: null,
                  nodesToDeleteScan: [],
                },
                ActionEnumType.REFRESH_ACCOUNT,
              )
            }
          >
            Refresh{' '}
            {getDisplayNameOfNodeType(
              nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum,
            ).toLowerCase()}
          </Button>
          <Button
            variant="flat"
            startIcon={<TrashLineIcon />}
            size="sm"
            disabled={nodeIdsToDelete.length === 0}
            color="error"
            onClick={() =>
              onBulkAction(
                {
                  scanIdsToCancelScan: [],
                  scanIdsToDeleteScan: [],
                  nodesToStartScan: null,
                  nodesToDeleteScan: nodeIdsToDelete,
                },
                ActionEnumType.DELETE_ACCOUNT,
              )
            }
          >
            Delete{' '}
            {getDisplayNameOfNodeType(
              nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum,
            ).toLowerCase()}
          </Button>
        </>
      ) : null}
    </>
  );
};

const useGetAgentVersions = () => {
  return useSuspenseQuery({
    ...queries.setting.listAgentVersion(),
  });
};

const AccountTable = ({
  setRowSelectionState,
  rowSelectionState,
  onTableAction,
  scanType,
  nodeType,
}: {
  nodeType?: ComplianceScanNodeTypeEnum;
  scanType: 'ComplianceScan' | 'CloudComplianceScan';
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  rowSelectionState: RowSelectionState;
  onTableAction: (row: ModelCloudNodeAccountInfo, actionType: ActionEnumType) => void;
}) => {
  const { mode: theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = usePostureAccounts();
  const { data: versionsData } = useGetAgentVersions();
  const versions = versionsData.versions ?? [];

  const [sort, setSort] = useSortingState();

  const columnHelper = createColumnHelper<ModelCloudNodeAccountInfo>();

  const accounts = data?.accounts ?? [];
  const columnWidth = {
    node_name: {
      minSize: 80,
      size: 90,
      maxSize: 100,
    },
    compliance_percentage: {
      minSize: 60,
      size: 60,
      maxSize: 70,
    },
    active: {
      minSize: 40,
      size: 40,
      maxSize: 40,
    },
    account_name: {
      minSize: 50,
      size: 70,
      maxSize: 80,
    },
    last_scan_status: {
      minSize: 50,
      size: 70,
      maxSize: 80,
    },
    refresh_status: {
      minSize: 50,
      size: 70,
      maxSize: 80,
    },
    version: {
      minSize: 50,
      size: 70,
      maxSize: 80,
    },
    tracer: {
      minSize: 50,
      size: 70,
      maxSize: 80,
    },
  };

  const columns = useMemo(() => {
    const columns: ColumnDef<ModelCloudNodeAccountInfo, any>[] = [
      getRowSelectionColumn(columnHelper, {
        minSize: 15,
        size: 15,
        maxSize: 15,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          return (
            <ActionDropdown
              row={cell.row.original}
              nodeType={nodeType}
              scanType={scanType}
              onTableAction={onTableAction}
              trigger={
                <button className="p-1 flex">
                  <span className="block h-4 w-4 text-text-text-and-icon rotate-90 shrink-0">
                    <EllipsisIcon />
                  </span>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 15,
        size: 15,
        maxSize: 15,
        enableResizing: false,
      }),
      columnHelper.accessor('node_name', {
        cell: (cell) => {
          const isNeverScan = cell.row.original.last_scan_status?.toLowerCase() === '';
          const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
            let path = '/posture/scan-results/:nodeType/:scanId';

            if (
              (cell.row.original.cloud_provider &&
                isCloudNode(
                  cell.row.original
                    .cloud_provider as ModelCloudNodeAccountsListReqCloudProviderEnum,
                )) ||
              isCloudOrgNode(
                cell.row.original
                  .cloud_provider as ModelCloudNodeAccountsListReqCloudProviderEnum,
              )
            ) {
              path = '/posture/cloud/scan-results/:nodeType/:scanId';
            }
            const redirectUrl = generatePath(`${path}`, {
              scanId: encodeURIComponent(cell.row.original.last_scan_id ?? ''),
              nodeType: cell.row.original.cloud_provider ?? '',
            });
            return isNeverScan ||
              isScanDeletePending(cell.row.original.last_scan_status!) ? (
              <span>{children}</span>
            ) : (
              <DFLink to={redirectUrl}>{children}</DFLink>
            );
          };
          return (
            <WrapperComponent>
              <div className="flex items-center gap-x-2 truncate">
                <span className="truncate">{cell.getValue()}</span>
              </div>
            </WrapperComponent>
          );
        },
        header: () =>
          upperFirst(
            getDisplayNameOfNodeType(
              nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum,
            ).toLowerCase(),
          ),
        ...columnWidth.node_name,
      }),
      columnHelper.accessor('compliance_percentage', {
        ...columnWidth.compliance_percentage,
        header: () => 'Compliance %',
        cell: (cell) => {
          const percent = Number(cell.getValue());
          const isScanned = !!cell.row.original.last_scan_status;

          if (isScanned || isCloudOrgNode(nodeType)) {
            return (
              <span
                style={{
                  color: getColorForCompliancePercent(theme, percent),
                }}
              >
                {formatPercentage(percent, {
                  maximumFractionDigits: 1,
                })}
              </span>
            );
          } else {
            return <span>Unknown</span>;
          }
        },
      }),
      columnHelper.accessor('last_scan_status', {
        cell: (info) => {
          if (isCloudOrgNode(nodeType)) {
            const data = info.row.original.scan_status_map ?? {};
            const statuses = Object.keys(data).map((current) => {
              return (
                <div className="flex gap-x-1.5 items-center" key={current}>
                  <span className="text-text-input-value font-medium">
                    {data[current]}
                  </span>
                  <ScanStatusBadge status={current ?? ''} />
                </div>
              );
            });
            return <div className="space-y-1.5 py-1">{statuses}</div>;
          } else {
            const value = info.getValue();
            return <ScanStatusBadge status={value ?? ''} />;
          }
        },
        header: () => 'Scan status',
        ...columnWidth.last_scan_status,
      }),
      columnHelper.accessor('active', {
        ...columnWidth.active,
        header: () => 'Active',
        cell: (info) => {
          return (
            <span className={cn({ 'text-status-success': info.getValue() })}>
              {info.getValue() ? 'Yes' : 'No'}
            </span>
          );
        },
      }),
    ];

    if (isCloudNonOrgNode(nodeType) || isCloudOrgNode(nodeType)) {
      columns.splice(
        3,
        0,
        columnHelper.accessor('account_name', {
          ...columnWidth.account_name,
          header: () => 'Name',
          cell: (info) => {
            return (
              <TruncatedText text={info.getValue() || info.row.original.node_name} />
            );
          },
        }),
      );
      columns.splice(
        6,
        0,
        columnHelper.accessor('refresh_status', {
          ...columnWidth.refresh_status,
          header: () => 'Refresh status',
          cell: (info) => {
            if (isCloudOrgNode(nodeType)) {
              const data = info.row.original.refresh_status_map ?? {};
              const statuses = Object.keys(data).map((current) => {
                return (
                  <div className="flex gap-x-1.5 items-center" key={current}>
                    <span className="text-text-input-value font-medium">
                      {data[current]}
                    </span>
                    <ScanStatusBadge
                      status={current}
                      errorMessage={info.row.original.refresh_message}
                    />
                  </div>
                );
              });
              return <div className="space-y-1.5 py-1">{statuses}</div>;
            } else {
              return (
                <ScanStatusBadge
                  status={info.getValue() ?? ''}
                  errorMessage={info.row.original.refresh_message}
                />
              );
            }
          },
        }),
      );
      columns.push(
        columnHelper.accessor('version', {
          enableSorting: false,
          cell: (info) => {
            const upgradeAvailable = isUpgradeAvailable(info.getValue(), versions);
            return (
              <div className="flex items-center gap-2 justify-start">
                <div className="truncate">{info.getValue() ?? ''}</div>
                {upgradeAvailable && (
                  <Tooltip
                    content={
                      <div className="flex-col gap-2 dark:text-text-text-and-icon text-text-text-inverse">
                        <div className="text-h5">Update Available.</div>
                        <div className="text-p6">
                          Version <span className="text-h6">{versions[0]}</span> is
                          available. Please follow{' '}
                          <DFLink
                            href="https://community.deepfence.io/threatmapper/docs/cloudscanner/"
                            target="_blank"
                            className="dark:text-text-link text-blue-500"
                          >
                            these instructions
                          </DFLink>{' '}
                          to upgrade the scanner. If you need automatic updates to the
                          scanner, please try{' '}
                          <DFLink
                            href="https://www.deepfence.io/threatstryker"
                            target="_blank"
                            className="dark:text-text-link text-blue-500"
                          >
                            ThreatStryker
                          </DFLink>
                          .
                        </div>
                      </div>
                    }
                  >
                    <div className="h-4 w-4 dark:text-status-warning">
                      <ArrowUpCircleLine />
                    </div>
                  </Tooltip>
                )}
              </div>
            );
          },
          header: () => 'Scanner version',
          ...columnWidth.version,
        }),
      );
    }

    return columns;
  }, [rowSelectionState, searchParams, data, nodeType, versions, theme]);

  return (
    <>
      <div>
        <Table
          size="default"
          data={accounts ?? []}
          columns={columns}
          enablePagination
          manualPagination
          totalRows={data?.totalRows ?? 0}
          pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
          pageIndex={data?.currentPage ?? 0}
          onPaginationChange={(updaterOrValue) => {
            let newPageIndex = 0;
            if (typeof updaterOrValue === 'function') {
              newPageIndex = updaterOrValue({
                pageIndex: data?.currentPage ?? 0,
                pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
              }).pageIndex;
            } else {
              newPageIndex = updaterOrValue.pageIndex;
            }
            setSearchParams((prev) => {
              prev.set('page', String(newPageIndex));
              return prev;
            });
          }}
          approximatePagination
          enableRowSelection
          rowSelectionState={rowSelectionState}
          onRowSelectionChange={setRowSelectionState}
          getRowId={(row) => {
            return JSON.stringify({
              scanId: row.last_scan_id,
              nodeId: row.node_id,
              nodeType: row.cloud_provider,
              active: row.active,
              scanStatus: row.last_scan_status,
            });
          }}
          enableColumnResizing
          enableSorting
          manualSorting
          sortingState={sort}
          onSortingChange={(updaterOrValue) => {
            let newSortState: SortingState = [];
            if (typeof updaterOrValue === 'function') {
              newSortState = updaterOrValue(sort);
            } else {
              newSortState = updaterOrValue;
            }
            setSearchParams((prev) => {
              if (!newSortState.length) {
                prev.delete('sortby');
                prev.delete('desc');
              } else {
                prev.set('sortby', String(newSortState[0].id));
                prev.set('desc', String(newSortState[0].desc));
              }
              return prev;
            });
            setSort(newSortState);
          }}
          enablePageResize
          onPageResize={(newSize) => {
            setSearchParams((prev) => {
              prev.set('size', String(newSize));
              prev.delete('page');
              return prev;
            });
          }}
          noDataElement={
            <TableNoDataElement text="No accounts available, please add new account" />
          }
        />
      </div>
    </>
  );
};

const Header = () => {
  const routeParams = useParams() as {
    nodeType: string;
  };
  const isFetching = useIsFetching({
    queryKey: queries.posture.postureAccounts._def,
  });

  return (
    <BreadcrumbWrapper>
      <Breadcrumb>
        <BreadcrumbLink asChild icon={<PostureIcon />} isLink>
          <DFLink to={'/posture'} unstyled>
            Posture
          </DFLink>
        </BreadcrumbLink>
        <BreadcrumbLink>
          <span className="inherit cursor-auto">
            {providersToNameMapping[routeParams.nodeType]}
          </span>
        </BreadcrumbLink>
      </Breadcrumb>
      <div className="ml-2 flex items-center">
        {isFetching ? <CircleSpinner size="sm" /> : null}
      </div>
    </BreadcrumbWrapper>
  );
};
const Accounts = () => {
  const [searchParams] = useSearchParams();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const fetcher = useFetcher();
  const routeParams = useParams() as {
    nodeType: string;
  };

  const nodeType = getNodeTypeByProviderName(
    routeParams.nodeType as ComplianceScanNodeTypeEnum,
  );

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showCancelScan, setShowCancelScan] = useState(false);
  const [openStartScan, setOpenStartScan] = useState<boolean>(false);

  const scanType = isNonCloudNode(routeParams.nodeType)
    ? ScanTypeEnum.ComplianceScan
    : ScanTypeEnum.CloudComplianceScan;

  const selectedRows = useMemo<
    {
      scanId: string;
      nodeId: string;
      nodeType: string;
      active: boolean;
      scanStatus: string;
    }[]
  >(() => {
    return Object.keys(rowSelectionState).map((item) => {
      return JSON.parse(item);
    });
  }, [rowSelectionState]);

  const [rowToAction, setRowToAction] = useState<{
    scanIdsToCancelScan: string[];
    scanIdsToDeleteScan: string[];
    nodesToStartScan: ComplianceScanConfigureFormProps['data'] | null;
    nodesToDeleteScan: string[];
  }>({
    scanIdsToCancelScan: [],
    scanIdsToDeleteScan: [],
    nodesToStartScan: null,
    nodesToDeleteScan: [],
  });

  const onTableAction = useCallback(
    (row: ModelCloudNodeAccountInfo, actionType: ActionEnumType) => {
      if (actionType === ActionEnumType.START_SCAN && nodeType) {
        setRowToAction({
          scanIdsToCancelScan: [],
          scanIdsToDeleteScan: [],
          nodesToStartScan: {
            nodeIds: [row.node_id!],
            nodeType: nodeType,
          },
          nodesToDeleteScan: [],
        });
        setOpenStartScan(true);
        return;
      } else if (actionType === ActionEnumType.REFRESH_ACCOUNT) {
        const formData = new FormData();
        formData.append('actionType', ActionEnumType.REFRESH_ACCOUNT);
        [row.node_id!].forEach((nodeId) => formData.append('accountId[]', nodeId));
        fetcher.submit(formData, {
          method: 'post',
        });
        return;
      } else if (actionType === ActionEnumType.DELETE_SCAN) {
        setRowToAction({
          scanIdsToCancelScan: [],
          scanIdsToDeleteScan: [row.last_scan_id!],
          nodesToStartScan: null,
          nodesToDeleteScan: [],
        });
        setShowDeleteDialog(true);
      } else if (actionType === ActionEnumType.CANCEL_SCAN) {
        setRowToAction({
          scanIdsToCancelScan: [row.last_scan_id!],
          scanIdsToDeleteScan: [],
          nodesToStartScan: null,
          nodesToDeleteScan: [],
        });
        setShowCancelScan(true);
      } else if (actionType === ActionEnumType.DELETE_ACCOUNT) {
        setRowToAction({
          scanIdsToCancelScan: [],
          scanIdsToDeleteScan: [],
          nodesToStartScan: null,
          nodesToDeleteScan: [row.node_id!],
        });
        setShowDeleteAccountDialog(true);
      }
    },
    [fetcher],
  );

  const onBulkAction = (
    data: {
      scanIdsToCancelScan: string[];
      scanIdsToDeleteScan: string[];
      nodesToStartScan: ComplianceScanConfigureFormProps['data'] | null;
      nodesToDeleteScan: string[];
    },
    actionType: string,
  ) => {
    setRowToAction({
      scanIdsToCancelScan: data.scanIdsToCancelScan,
      scanIdsToDeleteScan: data.scanIdsToDeleteScan,
      nodesToStartScan: data.nodesToStartScan,
      nodesToDeleteScan: data.nodesToDeleteScan,
    });
    if (actionType === ActionEnumType.DELETE_SCAN) {
      setShowDeleteDialog(true);
    } else if (actionType === ActionEnumType.CANCEL_SCAN) {
      setShowCancelScan(true);
    } else if (actionType === ActionEnumType.START_SCAN) {
      setOpenStartScan(true);
    } else if (actionType === ActionEnumType.REFRESH_ACCOUNT) {
      const formData = new FormData();
      formData.append('actionType', ActionEnumType.REFRESH_ACCOUNT);
      selectedRows.forEach((row) => formData.append('accountId[]', row.nodeId));
      fetcher.submit(formData, {
        method: 'post',
      });
    } else if (actionType === ActionEnumType.DELETE_ACCOUNT) {
      setShowDeleteAccountDialog(true);
    }
  };

  return (
    <div>
      {!isCloudNode(nodeType ?? '') ? <Header /> : null}
      {showCancelScan && (
        <StopScanForm
          open={true}
          closeModal={setShowCancelScan}
          scanIds={rowToAction.scanIdsToCancelScan}
          scanType={scanType}
          onCancelScanSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
      {openStartScan && (
        <ConfigureScanModal
          open={true}
          onOpenChange={() => setOpenStartScan(false)}
          onSuccess={() => setRowSelectionState({})}
          scanOptions={
            nodeType && rowToAction.nodesToStartScan
              ? {
                  showAdvancedOptions: true,
                  scanType,
                  data: rowToAction.nodesToStartScan,
                }
              : undefined
          }
        />
      )}
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          scanIds={rowToAction.scanIdsToDeleteScan}
          scanType={
            isNonCloudNode(routeParams.nodeType)
              ? ModelBulkDeleteScansRequestScanTypeEnum.Compliance
              : ModelBulkDeleteScansRequestScanTypeEnum.CloudCompliance
          }
          setShowDialog={setShowDeleteDialog}
          onSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
      {showDeleteAccountDialog ? (
        <DeleteAccountConfirmationModal
          showDialog={showDeleteAccountDialog}
          accountIds={rowToAction.nodesToDeleteScan}
          setShowDialog={setShowDeleteAccountDialog}
          onSuccess={() => {
            setRowSelectionState({});
          }}
        />
      ) : null}
      <div className="mb-4 mx-4">
        <div className="flex h-12 items-center">
          <BulkActions
            nodeType={nodeType}
            onBulkAction={onBulkAction}
            selectedRows={selectedRows}
          />
          <Button
            variant="flat"
            className="ml-auto"
            startIcon={<FilterIcon />}
            endIcon={
              getAppliedFiltersCount(searchParams) > 0 ? (
                <Badge
                  label={String(getAppliedFiltersCount(searchParams))}
                  variant="filled"
                  size="small"
                  color="blue"
                />
              ) : null
            }
            size="sm"
            onClick={() => {
              setFiltersExpanded((prev) => !prev);
            }}
            data-testid="filterButtonIdForTable"
          >
            Filter
          </Button>
        </div>
        {filtersExpanded ? <Filters /> : null}
        <Suspense fallback={<TableSkeleton columns={6} rows={10} />}>
          <AccountTable
            setRowSelectionState={setRowSelectionState}
            rowSelectionState={rowSelectionState}
            onTableAction={onTableAction}
            scanType={scanType}
            nodeType={nodeType}
          />
        </Suspense>
      </div>
    </div>
  );
};

const tabs = ['accounts', 'org-accounts'] as const;

function getTabLabel(value: (typeof tabs)[number], nodeType: string) {
  if (nodeType?.includes?.('azure')) {
    if (value === 'accounts') {
      return 'Subscriptions';
    } else {
      return 'Tenants';
    }
  } else if (nodeType?.includes?.('gcp')) {
    if (value === 'accounts') {
      return 'Projects';
    } else {
      return 'Organization Projects';
    }
  }
  return value === 'accounts' ? 'Regular Accounts' : 'Organization Accounts';
}

const AccountWithTab = () => {
  const { nodeType } = useParams() as {
    nodeType: string;
  };

  const [currentTab, setTab] = useState(() => {
    return isCloudOrgNode(nodeType) ? 'org-accounts' : 'accounts';
  });
  const { navigate } = usePageNavigation();

  const tabOpts = tabs.map((tab) => {
    return {
      label: getTabLabel(tab, nodeType),
      value: tab,
    };
  });

  return (
    <>
      <Header />
      <Tabs
        className="mt-2"
        value={currentTab}
        tabs={tabOpts}
        onValueChange={(value) => {
          if (currentTab === value) return;
          let _nodeType = nodeType;
          if (value === 'org-accounts') {
            _nodeType = _nodeType + '_org';
          } else {
            _nodeType = _nodeType.split('_')[0];
          }
          setTab(value);
          navigate(
            generatePath('/posture/accounts/:nodeType', {
              nodeType: _nodeType,
            }),
          );
        }}
        size="md"
      >
        <div className="mt-2">
          <Accounts key={nodeType} />
        </div>
      </Tabs>
    </>
  );
};

const ConditionalAccount = () => {
  const { nodeType } = useParams() as {
    nodeType: string;
  };

  if (isCloudNode(nodeType)) {
    return <AccountWithTab />;
  }
  return <Accounts />;
};

const isCloudNode = (nodeType: string) =>
  isCloudNonOrgNode(nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum) ||
  isCloudOrgNode(nodeType as ModelCloudNodeAccountsListReqCloudProviderEnum);

export const module = {
  action,
  element: <ConditionalAccount />,
};
