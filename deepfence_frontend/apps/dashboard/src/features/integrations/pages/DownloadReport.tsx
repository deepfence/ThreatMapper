import cx from 'classnames';
import { Suspense, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  HiArchive,
  HiChevronRight,
  HiDotsVertical,
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
  CircleSpinner,
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
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ModelExportReport } from '@/api/generated/models/ModelExportReport';
import { DFLink } from '@/components/DFLink';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { TruncatedText } from '@/components/TruncatedText';
import { useGetClustersList } from '@/features/common/data-component/searchClustersApiLoader';
import { useGetContainerImagesList } from '@/features/common/data-component/searchContainerImagesApiLoader';
import { useGetContainersList } from '@/features/common/data-component/searchContainersApiLoader';
import { useGetHostsList } from '@/features/common/data-component/searchHostsApiLoader';
import { ActionReturnType } from '@/features/registries/components/RegistryAccountsTable';
import { ScanTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

enum ActionEnumType {
  DELETE = 'delete',
  ADD = 'add',
}
const DURATION: { [k: string]: number } = {
  'Last 1 Day': 1,
  'Last 7 Days': 7,
  'Last 30 Days': 30,
  'Last 60 Days': 60,
  'Last 90 Days': 90,
  'Last 180 Days': 100,
  'All Documents': 99999,
};
type LoaderDataType = {
  message?: string;
  data?: ModelExportReport[];
};

const getReportList = async (): Promise<LoaderDataType> => {
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
    const duration = DURATION[body.duration.toString()];
    const r = await makeRequest({
      apiFunction: getReportsApiClient().generateReport,
      apiArgs: [
        {
          modelGenerateReportReq: {
            duration: duration,

            filters: {
              scan_type: body.resource.toString().toLowerCase(),
              node_type: body.nodeType.toString().toLowerCase(),
              severity_or_check_type: severity.map((sev) => sev.toString().toLowerCase()),
            },

            report_type: body.downloadType.toString().toLowerCase(),
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
    toast('Report download has been triggerred');
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
          <Button size="xs" onClick={() => setShowDialog(false)}>
            No, cancel
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
        cell: (cell) => cell.getValue(),
        header: () => 'Duration',
        minSize: 35,
        size: 40,
        maxSize: 45,
      }),
      columnHelper.accessor('storage_path', {
        cell: (cell) => cell.getValue() || '-',
        header: () => 'Storage Path',
        minSize: 75,
        size: 80,
        maxSize: 85,
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
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('filters', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => 'Filters',
        minSize: 75,
        size: 80,
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
          {(resolvedData: LoaderDataType) => {
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

const getProviderNodeList = (nodeType: string) => {
  switch (nodeType) {
    case 'AWS':
      return complianceType.aws;
    case 'Google':
      return complianceType.gcp;
    case 'Azure':
      return complianceType.azure;
    case 'Linux':
      return complianceType.host;
    default:
      console.error('Provider type should be match');
      return [];
  }
};
const isCloudAccount = (provider: string) =>
  ['AWS', 'Google', 'Azure'].includes(provider);

const AdvancedFilter = ({
  resourceType,
  provider,
}: {
  resourceType: string;
  provider: string;
}) => {
  const [selectedHosts, setSelectedHosts] = useState([]);
  const [selectedContainerImages, setSelectedContainerImages] = useState([]);
  const [_containers, setContainers] = useState([]);
  const { hosts, status: listHostStatus } = useGetHostsList({
    scanType: 'none',
  });

  const { containerImages, status: listContainerImageStatus } = useGetContainerImagesList(
    {
      scanType: ScanTypeEnum.SecretScan,
    },
  );
  const { containers, status: listContainerStatus } = useGetContainersList({
    scanType: ScanTypeEnum.SecretScan,
  });
  const { clusters, status: listClusterStatus } = useGetClustersList();

  const [maskedType, setMaskedType] = useState([]);

  console.log('ppp', provider);
  return (
    <>
      {resourceType && provider ? (
        <div className="text-gray-700 dark:text-gray-400 text-xs uppercase font-semibold">
          Advanced Filter(Optional)
        </div>
      ) : null}
      {resourceType &&
      provider &&
      resourceType === 'Compliance' &&
      !isCloudAccount(provider) ? (
        <>
          <div>
            {listHostStatus !== 'idle' ? (
              <div className="py-6">
                <CircleSpinner size="sm" />
              </div>
            ) : (
              <Select
                value={selectedHosts}
                name="nodeIds[]"
                onChange={(value) => {
                  setSelectedHosts(value);
                }}
                placeholder="Select host"
                label="Select host (Optional)"
                sizing="xs"
                className="mt-2"
              >
                {hosts.map((host) => {
                  return (
                    <SelectItem value={host.nodeId} key={host.nodeId}>
                      {host.hostName}
                    </SelectItem>
                  );
                })}
              </Select>
            )}
          </div>
        </>
      ) : null}

      {resourceType &&
      provider &&
      resourceType !== 'Compliance' &&
      provider === 'Host' ? (
        <>
          <div>
            {listHostStatus !== 'idle' ? (
              <div className="py-6">
                <CircleSpinner size="sm" />
              </div>
            ) : (
              <Select
                value={selectedHosts}
                name="nodeIds[]"
                onChange={(value) => {
                  setSelectedHosts(value);
                }}
                placeholder="Select host"
                label="Select host (Optional)"
                sizing="xs"
                className="mt-2"
              >
                {hosts.map((host) => {
                  return (
                    <SelectItem value={host.nodeId} key={host.nodeId}>
                      {host.hostName}
                    </SelectItem>
                  );
                })}
              </Select>
            )}
          </div>
        </>
      ) : null}

      {resourceType &&
      provider &&
      resourceType !== 'Compliance' &&
      provider === 'Container Image' ? (
        <>
          <div>
            {listContainerImageStatus !== 'idle' ? (
              <div className="py-6">
                <CircleSpinner size="sm" />
              </div>
            ) : (
              <Select
                value={selectedContainerImages}
                name="nodeIds[]"
                onChange={(value) => {
                  setSelectedContainerImages(value);
                }}
                placeholder="Select Container Image"
                label="Select Image"
                sizing="xs"
                className="mt-2"
              >
                {containerImages.map((image) => {
                  return (
                    <SelectItem value={image.nodeId} key={image.nodeId}>
                      {image.containerImage}
                    </SelectItem>
                  );
                })}
              </Select>
            )}
          </div>
        </>
      ) : null}

      {resourceType &&
      provider &&
      resourceType !== 'Compliance' &&
      provider === 'Container' ? (
        <>
          <div>
            {listContainerStatus !== 'idle' ? (
              <div className="py-6">
                <CircleSpinner size="sm" />
              </div>
            ) : (
              <Select
                value={_containers}
                name="nodeIds[]"
                onChange={(value) => {
                  setContainers(value);
                }}
                placeholder="Select Containers"
                label="Select Containers"
                sizing="xs"
                className="mt-2"
              >
                {containers.map((container) => {
                  return (
                    <SelectItem value={container.nodeId} key={container.nodeId}>
                      {container.nodeName}
                    </SelectItem>
                  );
                })}
              </Select>
            )}
          </div>
        </>
      ) : null}

      {resourceType && provider && resourceType !== 'Compliance' && provider === 'Pod' ? (
        <>
          <div>
            {listClusterStatus !== 'idle' ? (
              <div className="py-6">
                <CircleSpinner size="sm" />
              </div>
            ) : (
              <Select
                value={_containers}
                name="nodeIds[]"
                onChange={(value) => {
                  setContainers(value);
                }}
                placeholder="Select Clusters"
                label="Select Clusters"
                sizing="xs"
                className="mt-2"
              >
                {clusters.map((cluster) => {
                  return (
                    <SelectItem value={cluster.clusterId} key={cluster.clusterId}>
                      {cluster.clusterName}
                    </SelectItem>
                  );
                })}
              </Select>
            )}
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
    </>
  );
};
const ComplianceForm = ({
  setProvider,
}: {
  setProvider: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const [provider, _setProvider] = useState('');
  const [benchmarkType, setBenchmarkType] = useState('');

  return (
    <div className="flex flex-col gap-y-4">
      <Select
        label="Select Provider"
        value={provider}
        name="nodeType"
        onChange={(value) => {
          _setProvider(value);
          setProvider(value);
        }}
        placeholder="Select Provider"
        sizing="xs"
      >
        {['AWS', 'Google', 'Azure', 'Linux'].map((resource) => {
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
            {getProviderNodeList(provider)?.map((provider) => {
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
}: {
  setProvider: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const [severity, setSeverity] = useState([]);
  const [nodeType, setNodeType] = useState('');

  return (
    <>
      <Select
        label="Select Node Type"
        value={nodeType}
        name="nodeType"
        onChange={(value) => {
          setNodeType(value);
          setProvider(value);
        }}
        placeholder="Select Node Type"
        sizing="xs"
      >
        {['Host', 'Container', 'Container Image', 'Pod'].map((resource) => {
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
      <Card className="w-full relative p-5 flex flex-col pt-8 gap-y-4">
        <input
          type="text"
          name="_actionType"
          readOnly
          hidden
          value={ActionEnumType.ADD}
        />
        <Select
          label="Select Resource"
          value={resource}
          name="resource"
          onChange={(value) => {
            setResource(value);
          }}
          placeholder="Select resource"
          sizing="xs"
        >
          {['Vulnerability', 'Secret', 'Malware', 'Compliance'].map((resource) => {
            return (
              <SelectItem value={resource} key={resource}>
                {resource}
              </SelectItem>
            );
          })}
        </Select>

        {resource === 'Compliance' ? <ComplianceForm setProvider={setProvider} /> : null}

        {resource !== 'Compliance' ? <CommomForm setProvider={setProvider} /> : null}

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
          name="selectAll"
          value="all"
          onCheckedChange={setIncludeDeadNodes}
          checked={deadNodes}
        />

        <AdvancedFilter provider={provider} resourceType={resource} />

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
          {['XLSX', 'PDF'].map((resource) => {
            return (
              <SelectItem value={resource} key={resource}>
                {resource}
              </SelectItem>
            );
          })}
        </Select>

        <Button size="xs" color="primary" className="mt-2">
          Download
        </Button>
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
            <DFLink to="/integrations">INTEGRATIONS</DFLink>
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
