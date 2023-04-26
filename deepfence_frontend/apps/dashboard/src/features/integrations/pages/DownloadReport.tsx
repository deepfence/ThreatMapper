import cx from 'classnames';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  HiArchive,
  HiChevronRight,
  HiDotsVertical,
  HiDownload,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import {
  ActionFunctionArgs,
  Form,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from 'react-router-dom';
import { useInterval } from 'react-use';
import { toast } from 'sonner';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Modal,
  Select,
  SelectItem,
  Switch,
  Table,
  TableSkeleton,
  TextInput,
} from 'ui-components';

import { getReportsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelCloudNodeAccountInfo,
  ModelGenerateReportReqDurationEnum,
  ModelGenerateReportReqReportTypeEnum,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
  UtilsReportFiltersSeverityOrCheckTypeEnum,
} from '@/api/generated';
import { ModelExportReport } from '@/api/generated/models/ModelExportReport';
import { DFLink } from '@/components/DFLink';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { TruncatedText } from '@/components/TruncatedText';
import {
  getAccounts,
  getNodeTypeByProviderName,
} from '@/features/postures/pages/Accounts';
import { ActionReturnType } from '@/features/registries/components/RegistryAccountsTable';
import { ScanTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { download } from '@/utils/download';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

const nonComplianceNode = (resourceType: string) => {
  if (resourceType === 'CloudCompliance') {
    return {
      Aws: UtilsReportFiltersNodeTypeEnum.Aws,
      Azure: UtilsReportFiltersNodeTypeEnum.Azure,
      Gcp: UtilsReportFiltersNodeTypeEnum.Gcp,
      Linux: UtilsReportFiltersNodeTypeEnum.Linux,
    };
  }
  return {
    Host: UtilsReportFiltersNodeTypeEnum.Host,
    Container: UtilsReportFiltersNodeTypeEnum.Container,
    ContainerImage: UtilsReportFiltersNodeTypeEnum.ContainerImage,
  };
};

enum ActionEnumType {
  DELETE = 'delete',
  ADD = 'add',
}
const DURATION: { [k: string]: ModelGenerateReportReqDurationEnum } = {
  'Last 1 Day': ModelGenerateReportReqDurationEnum.NUMBER_1,
  'Last 7 Days': ModelGenerateReportReqDurationEnum.NUMBER_7,
  'Last 30 Days': ModelGenerateReportReqDurationEnum.NUMBER_30,
  'Last 60 Days': ModelGenerateReportReqDurationEnum.NUMBER_60,
  'Last 90 Days': ModelGenerateReportReqDurationEnum.NUMBER_90,
  'Last 180 Days': ModelGenerateReportReqDurationEnum.NUMBER_180,
  'All Documents': 0 as ModelGenerateReportReqDurationEnum,
};
type LoaderDataType = {
  data: ReturnType<typeof getReportList>;
};

const getReportList = async (): Promise<{
  message?: string;
  data?: ModelExportReport[];
}> => {
  const reportsPromise = await makeRequest({
    apiFunction: getReportsApiClient().listReports,
    apiArgs: [],
  });

  if (ApiError.isApiError(reportsPromise)) {
    return {
      message: 'Error in getting reports',
    };
  }

  return {
    data: reportsPromise,
  };
};

const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getReportList(),
  });
};

const action = async ({
  request,
}: ActionFunctionArgs): Promise<{
  message?: string;
  success?: boolean;
  deleteSuccess?: boolean;
} | null> => {
  const formData = await request.formData();
  const _actionType = formData.get('_actionType')?.toString();

  if (!_actionType) {
    return {
      message: 'Action Type is required',
    };
  }

  if (_actionType === ActionEnumType.ADD) {
    const severity = formData.getAll('severity[]');
    const body = Object.fromEntries(formData);

    const duration = body.duration as keyof typeof DURATION;

    const reportType =
      body.downloadType as keyof typeof ModelGenerateReportReqReportTypeEnum;
    const _reportType: ModelGenerateReportReqReportTypeEnum =
      ModelGenerateReportReqReportTypeEnum[reportType];

    const resource = body.resource as keyof typeof UtilsReportFiltersScanTypeEnum;
    const _resource: UtilsReportFiltersScanTypeEnum =
      UtilsReportFiltersScanTypeEnum[resource];

    const nodeType = body.nodeType as keyof typeof UtilsReportFiltersNodeTypeEnum;
    const _nodeType: UtilsReportFiltersNodeTypeEnum =
      UtilsReportFiltersNodeTypeEnum[nodeType];

    const masked = formData.getAll('mask[]');
    const status = formData.getAll('status[]');
    const accountIds = formData.getAll('accountIds[]');
    const interval = formData.get('interval'); // send this when backend is ready to support

    // host filter
    const selectedHostLength = Number(formData.get('selectedHostLength'));
    const hostIds = [];
    if (selectedHostLength > 0) {
      for (let i = 0; i < selectedHostLength; i++) {
        hostIds.push(formData.get(`hostFilter[${i}]`) as string);
      }
    }

    // container filter
    const selectedContainerLength = Number(formData.get('selectedContainerLength'));
    const containers = [];
    if (selectedContainerLength > 0) {
      for (let i = 0; i < selectedContainerLength; i++) {
        containers.push(formData.get(`containerFilter[${i}]`) as string);
      }
    }

    // image filter
    const selectedImageLength = Number(formData.get('selectedImageLength'));
    const containerImages = [];
    if (selectedImageLength > 0) {
      for (let i = 0; i < selectedImageLength; i++) {
        containerImages.push(formData.get(`imageFilter[${i}]`) as string);
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

    const _masked: boolean[] = [];
    if (masked.includes('Masked')) {
      _masked.push(true);
    }
    if (masked.includes('Unmasked')) {
      _masked.push(false);
    }

    const advanced_report_filters: {
      masked?: boolean[];
      account_id?: string[];
      host_name?: string[];
      image_name?: string[];
      container_name?: string[];
      pod_name?: string[];
      kubernetes_cluster_name?: string[];
      scan_status?: string[];
    } = {};
    if (accountIds.length > 0) {
      advanced_report_filters.account_id = accountIds as string[];
    }

    if (hostIds.length > 0) {
      advanced_report_filters.host_name = hostIds as string[];
    }

    if (containerImages.length > 0) {
      advanced_report_filters.image_name = containerImages as string[];
    }

    if (containers.length > 0) {
      advanced_report_filters.container_name = containers as string[];
    }

    if (clusterIds.length > 0) {
      advanced_report_filters.pod_name = clusterIds as string[];
    }

    if (status.length > 0) {
      advanced_report_filters.scan_status = status as string[];
    }

    if (_masked.length > 0) {
      advanced_report_filters.masked = _masked;
    }

    const r = await makeRequest({
      apiFunction: getReportsApiClient().generateReport,
      apiArgs: [
        {
          modelGenerateReportReq: {
            duration: DURATION[duration],
            filters: {
              advanced_report_filters: advanced_report_filters,
              include_dead_nodes: body.deadNodes === 'on',
              node_type: _nodeType,
              scan_type: _resource,
              severity_or_check_type: (severity as string[]).map((sev) =>
                sev.toLowerCase(),
              ) as UtilsReportFiltersSeverityOrCheckTypeEnum,
            },

            report_type: _reportType,
          },
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<ActionReturnType>({
          success: false,
        });
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
      return {
        message: 'Error in adding integrations',
      };
    }
    toast('Generate Report has started');
    return {
      success: true,
    };
  } else if (_actionType === ActionEnumType.DELETE) {
    const id = formData.get('id')?.toString();
    if (!id) {
      return {
        deleteSuccess: false,
        message: 'An id is required to delete an integration',
      };
    }
    const r = await makeRequest({
      apiFunction: getReportsApiClient().deleteReport,
      apiArgs: [
        {
          reportId: id,
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<ActionReturnType>({
          success: false,
        });
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
      return {
        message: 'Error in adding report',
      };
    }
    toast('Report deleted successfully');
    return {
      deleteSuccess: true,
    };
  }

  return null;
};

const DeleteConfirmationModal = ({
  showDialog,
  id,
  setShowDialog,
}: {
  showDialog: boolean;
  id: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<{
    deleteSuccess: boolean;
    message: string;
  }>();

  if (fetcher.data?.deleteSuccess) {
    setShowDialog(false);
  }
  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <div className="grid place-items-center p-6">
        <IconContext.Provider
          value={{
            className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
          }}
        >
          <HiOutlineExclamationCircle />
        </IconContext.Provider>
        <h3 className="mb-4 font-normal text-center text-sm">
          The selected report will be deleted.
          <br />
          <span>Are you sure you want to delete?</span>
        </h3>

        {fetcher.data?.message ? (
          <p className="text-red-500 text-sm pb-4">{fetcher.data?.message}</p>
        ) : null}

        <div className="flex items-center justify-right gap-4">
          <Button size="xs" onClick={() => setShowDialog(false)} type="button" outline>
            No, Cancel
          </Button>
          <Button
            size="xs"
            color="danger"
            onClick={() => {
              const formData = new FormData();
              formData.append('_actionType', ActionEnumType.DELETE);
              formData.append('id', id);
              fetcher.submit(formData, {
                method: 'post',
              });
            }}
          >
            Yes, I&apos;m sure
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ActionDropdown = ({
  icon,
  data,
}: {
  icon: React.ReactNode;
  data: ModelExportReport;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <DeleteConfirmationModal
        showDialog={showDeleteDialog}
        id={data.report_id ?? ''}
        setShowDialog={setShowDeleteDialog}
      />
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem
              className="text-sm"
              onClick={() => {
                download(data.url ?? '');
              }}
            >
              <span className="flex items-center gap-x-2">
                <IconContext.Provider value={{ className: '' }}>
                  <HiDownload />
                </IconContext.Provider>
                Download
              </span>
            </DropdownItem>
            <DropdownItem
              className="text-sm"
              onClick={() => {
                setShowDeleteDialog(true);
              }}
            >
              <span className="flex items-center gap-x-2 text-red-700 dark:text-red-400">
                <IconContext.Provider
                  value={{ className: 'text-red-700 dark:text-red-400' }}
                >
                  <HiArchive />
                </IconContext.Provider>
                Delete
              </span>
            </DropdownItem>
          </>
        }
      >
        <Button size="xs" color="normal" className="hover:bg-transparent">
          <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
            {icon}
          </IconContext.Provider>
        </Button>
      </Dropdown>
    </>
  );
};

export const ReportTable = () => {
  const columnHelper = createColumnHelper<ModelExportReport>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('type', {
        cell: (cell) => cell.getValue(),
        header: () => 'Report Type',
        minSize: 40,
        size: 50,
        maxSize: 55,
      }),
      columnHelper.accessor('created_at', {
        cell: (cell) => formatMilliseconds(cell.getValue() ?? ''),
        header: () => 'Created At',
        minSize: 65,
        size: 65,
        maxSize: 70,
      }),
      columnHelper.accessor('duration', {
        cell: (cell) => {
          const duration = cell.getValue();
          if (duration === 1) {
            return 'Last 1 day';
          } else if (duration === 0) {
            return 'All documents';
          } else {
            return `Last ${duration} days`;
          }
        },
        header: () => 'Duration',
        minSize: 50,
        size: 55,
        maxSize: 60,
      }),
      columnHelper.accessor('status', {
        cell: (cell) => (
          <Badge
            label={cell?.getValue()?.toUpperCase().replaceAll('_', ' ')}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                cell?.getValue()?.toLowerCase() === 'complete',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                cell?.getValue()?.toLowerCase() === 'error',
              'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                cell?.getValue()?.toLowerCase() === 'in_progress',
            })}
            size="sm"
          />
        ),
        header: () => 'Status',
        minSize: 60,
        size: 65,
        maxSize: 70,
      }),
      columnHelper.accessor('filters', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => 'Filters',
        minSize: 75,
        size: 85,
        maxSize: 85,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown icon={<HiDotsVertical />} data={cell.row.original} />
        ),
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
    <>
      <Suspense fallback={<TableSkeleton columns={4} rows={5} size={'sm'} />}>
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: { message?: string; data?: ModelExportReport[] }) => {
            const { data = [], message } = resolvedData;

            return (
              <div>
                {message ? (
                  <p className="text-red-500 text-sm">{message}</p>
                ) : (
                  <Table size="sm" data={data} columns={columns} enablePagination />
                )}
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </>
  );
};

const getBenchmarkList = (nodeType: string) => {
  switch (nodeType) {
    case 'Aws':
      return complianceType.aws;
    case 'Google':
      return complianceType.gcp;
    case 'Azure':
      return complianceType.azure;
    case 'Linux':
      return complianceType.host;
    default:
      console.error('Provider type should be matched');
      return [];
  }
};
const isCloudAccount = (provider: string) =>
  provider === 'Aws' || provider === 'Azure' || provider === 'Gcp';

const API_SCAN_TYPE_MAP: {
  [key: string]: ScanTypeEnum;
} = {
  Vulnerability: ScanTypeEnum.VulnerabilityScan,
  Secret: ScanTypeEnum.SecretScan,
  Malware: ScanTypeEnum.MalwareScan,
  Compliance: ScanTypeEnum.ComplianceScan,
};

const AdvancedFilter = ({
  resourceType,
  provider,
}: {
  resourceType: string;
  provider: string;
}) => {
  const [cloudAccounts, setCloudAccounts] = useState<ModelCloudNodeAccountInfo[]>([]);
  const [selectedCloudAccounts, setSelectedCloudAccounts] = useState([]);

  const [maskedType, setMaskedType] = useState([]);
  const [status, setStatus] = useState([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      const data = await getAccounts(
        getNodeTypeByProviderName(provider.toLowerCase()),
        new URLSearchParams(),
      );
      setCloudAccounts(data.accounts);
    };
    if (isCloudAccount(provider)) {
      fetchAccounts();
    }
  }, [resourceType, provider]);

  return (
    <>
      {resourceType && provider ? (
        <div className="flex flex-col gap-y-4 pt-0 bg-slate-100 dark:bg-slate-700 p-5">
          {resourceType && provider ? (
            <div className="text-gray-700 dark:text-gray-100 text-xs uppercase font-bold pt-4">
              Advanced Filter (Optional)
            </div>
          ) : null}

          {isCloudAccount(provider) && (
            <Select
              value={selectedCloudAccounts}
              name="accountIds[]"
              onChange={(value) => {
                setSelectedCloudAccounts(value);
              }}
              placeholder="Select accounts"
              label="Select Account (Optional)"
              sizing="xs"
              className="mt-2"
            >
              {cloudAccounts.map((account) => {
                return (
                  <SelectItem value={account.node_id} key={account.node_id}>
                    {account.node_name}
                  </SelectItem>
                );
              })}
            </Select>
          )}

          {provider === 'Host' ? (
            <>
              <div>
                <SearchableHostList scanType={API_SCAN_TYPE_MAP[resourceType]} />
              </div>
            </>
          ) : null}

          {provider === 'ContainerImage' ? (
            <>
              <div>
                <SearchableImageList scanType={API_SCAN_TYPE_MAP[resourceType]} />
              </div>
            </>
          ) : null}

          {provider === 'Container' ? (
            <>
              <div>
                <SearchableContainerList scanType={API_SCAN_TYPE_MAP[resourceType]} />
              </div>
            </>
          ) : null}

          {resourceType !== 'CloudCompliance' ? (
            <>
              <div>
                <SearchableClusterList />
              </div>
            </>
          ) : null}

          {provider && (
            <Select
              value={maskedType}
              name="mask[]"
              onChange={(value) => {
                setMaskedType(value);
              }}
              placeholder="Select mask type"
              label="Select Mask/Unmask (Optional)"
              sizing="xs"
            >
              {['Masked', 'Unmasked']?.map((provider) => {
                return (
                  <SelectItem value={provider} key={provider}>
                    {provider}
                  </SelectItem>
                );
              })}
            </Select>
          )}
          {provider && (
            <Select
              value={status}
              name="status[]"
              onChange={(value) => {
                setStatus(value);
              }}
              placeholder="Select Status"
              label="Select Status (Optional)"
              sizing="xs"
            >
              {['COMPLETE', 'ERROR']?.map((provider) => {
                return (
                  <SelectItem value={provider} key={provider}>
                    {provider}
                  </SelectItem>
                );
              })}
            </Select>
          )}
        </div>
      ) : null}
    </>
  );
};
const CloudComplianceForm = ({
  setProvider,
  provider,
}: {
  setProvider: React.Dispatch<React.SetStateAction<string>>;
  provider: string;
}) => {
  const [benchmarkType, setBenchmarkType] = useState('');

  return (
    <div className="flex flex-col gap-y-4">
      <Select
        label="Select Provider"
        value={provider}
        name="nodeType"
        onChange={(value) => {
          setProvider(value);
        }}
        placeholder="Select Provider"
        sizing="xs"
      >
        {['Aws', 'Google', 'Azure', 'Linux'].map((resource) => {
          return (
            <SelectItem value={resource} key={resource}>
              {resource}
            </SelectItem>
          );
        })}
      </Select>

      {provider && (
        <>
          <Select
            value={benchmarkType}
            name="severity[]"
            onChange={(value) => {
              setBenchmarkType(value);
            }}
            placeholder="Select check type"
            label="Select Check Type"
            sizing="xs"
          >
            {getBenchmarkList(provider)?.map((provider) => {
              return (
                <SelectItem value={provider} key={provider}>
                  {provider}
                </SelectItem>
              );
            })}
          </Select>
        </>
      )}
    </div>
  );
};

const CommomForm = ({
  setProvider,
  resource,
  provider,
}: {
  setProvider: React.Dispatch<React.SetStateAction<string>>;
  resource: string;
  provider: string;
}) => {
  const [severity, setSeverity] = useState([]);

  return (
    <>
      <Select
        label="Select Node Type"
        value={provider}
        name="nodeType"
        onChange={(value) => {
          setProvider(value);
        }}
        placeholder="Select Node Type"
        sizing="xs"
      >
        {Object.keys(nonComplianceNode(resource)).map((resource) => {
          return (
            <SelectItem value={resource} key={resource}>
              {resource}
            </SelectItem>
          );
        })}
      </Select>
      <Select
        label="Select Severity"
        value={severity}
        name="severity[]"
        onChange={(value) => {
          setSeverity(value);
        }}
        placeholder="Select Severity"
        sizing="xs"
      >
        {['Critical', 'High', 'Medium', 'Low'].map((resource) => {
          return (
            <SelectItem value={resource} key={resource}>
              {resource}
            </SelectItem>
          );
        })}
      </Select>
    </>
  );
};

const DownloadForm = () => {
  const [resource, setResource] = useState('');
  const [provider, setProvider] = useState('');
  const [duration, setDuration] = useState('');
  const [downloadType, setDownloadType] = useState('');
  const [deadNodes, setIncludeDeadNodes] = useState(false);

  return (
    <Form method="post">
      <Card className="">
        <input
          type="text"
          name="_actionType"
          readOnly
          hidden
          value={ActionEnumType.ADD}
        />
        <div className="p-5 gap-y-4 flex flex-col">
          <Select
            label="Select Resource"
            value={resource}
            name="resource"
            onChange={(value) => {
              setResource(value);
              setProvider('');
            }}
            placeholder="Select resource"
            sizing="xs"
          >
            {Object.keys(UtilsReportFiltersScanTypeEnum).map((resource) => {
              return (
                <SelectItem value={resource} key={resource}>
                  {resource}
                </SelectItem>
              );
            })}
          </Select>

          {resource === 'CloudCompliance' ? (
            <CloudComplianceForm setProvider={setProvider} provider={provider} />
          ) : null}

          {resource !== 'CloudCompliance' ? (
            <CommomForm
              setProvider={setProvider}
              resource={resource}
              provider={provider}
            />
          ) : null}

          <Select
            label="Select Duration"
            value={duration}
            name="duration"
            onChange={(value) => {
              setDuration(value);
            }}
            placeholder="Select Duration"
            sizing="xs"
          >
            {Object.keys(DURATION).map((resource) => {
              return (
                <SelectItem value={resource} key={resource}>
                  {resource}
                </SelectItem>
              );
            })}
          </Select>

          <TextInput
            className="w-full"
            label={'Schedule Interval In Days'}
            type={'text'}
            sizing="sm"
            name={'interval'}
            placeholder={'Interval'}
          />

          <Switch
            label="Include Dead Nodes"
            size="sm"
            name="deadNodes"
            onCheckedChange={setIncludeDeadNodes}
            checked={deadNodes}
          />
        </div>

        <AdvancedFilter provider={provider} resourceType={resource} />

        <div className="p-5 pt-0 gap-y-4 flex flex-col">
          <Select
            label="Select Download Type"
            value={downloadType}
            name="downloadType"
            onChange={(value) => {
              setDownloadType(value);
            }}
            placeholder="Download Type"
            sizing="xs"
          >
            {Object.keys(ModelGenerateReportReqReportTypeEnum).map((resource) => {
              return (
                <SelectItem value={resource} key={resource}>
                  {resource}
                </SelectItem>
              );
            })}
          </Select>

          <Button size="xs" color="primary" className="mt-2">
            Generate Report
          </Button>
        </div>
      </Card>
    </Form>
  );
};

const DownloadReport = () => {
  const revalidator = useRevalidator();

  useInterval(() => {
    revalidator.revalidate();
  }, 15000);
  return (
    <>
      <div className="flex p-2  w-full items-center shadow bg-white dark:bg-gray-800">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <DFLink to="/integrations">Integrations</DFLink>
          </BreadcrumbLink>

          <BreadcrumbLink>
            <span className="inherit cursor-auto">Report Download</span>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>
      <div className="grid grid-cols-[310px_1fr] p-2 gap-x-2">
        <DownloadForm />
        <ReportTable />
      </div>
    </>
  );
};

export const module = {
  element: <DownloadReport />,
  loader,
  action,
};
