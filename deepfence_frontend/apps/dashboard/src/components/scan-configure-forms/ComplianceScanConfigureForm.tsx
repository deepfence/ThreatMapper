import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useState } from 'react';
import { memo, useMemo } from 'react';
import {
  ActionFunctionArgs,
  FetcherWithComponents,
  generatePath,
  useFetcher,
} from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from 'tailwind-preset';
import { Button, Checkbox, TableSkeleton, Tabs } from 'ui-components';
import { CircleSpinner, createColumnHelper, Switch, Table } from 'ui-components';

import { getComplianceApiClient, getSettingsApiClient } from '@/api/api';
import {
  ModelComplianceScanTriggerReq,
  ModelNodeIdentifierNodeTypeEnum,
  ModelScanResultsActionRequestScanTypeEnum,
} from '@/api/generated';
import { ModelCloudNodeComplianceControl } from '@/api/generated/models/ModelCloudNodeComplianceControl';
import { ScheduleScanForm } from '@/components/scan-configure-forms/ScheduleScanForm';
import { TruncatedText } from '@/components/TruncatedText';
import { ActionEnumType } from '@/features/postures/data-component/toggleControlApiAction';
import { invalidateAllQueries, queries } from '@/queries';
import { ComplianceScanNodeTypeEnum, isCloudNode, isCloudOrgNode } from '@/types/common';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

export const complianceType: {
  [key in ComplianceScanNodeTypeEnum]: string[];
} = {
  aws: ['CIS', 'NIST', 'PCI', 'HIPAA', 'SOC2', 'GDPR'],
  aws_org: ['CIS', 'NIST', 'PCI', 'HIPAA', 'SOC2', 'GDPR'],
  gcp: ['CIS'],
  gcp_org: ['CIS'],
  azure: ['CIS', 'NIST', 'HIPAA'],
  host: ['HIPAA', 'GDPR', 'PCI', 'NIST'],
  kubernetes_cluster: ['NSA-CISA'],
};
export type ComplianceScanConfigureFormProps = {
  showAdvancedOptions: boolean;
  showScheduleScanOptions: boolean;
  data: {
    nodeIds: string[];
    nodeType: ComplianceScanNodeTypeEnum;
  };
  onSuccess: (data?: { nodeType: string; bulkScanId: string }) => void;
  onCancel?: () => void;
};

export type ScanActionReturnType = {
  message?: string;
  success: boolean;
  data?: {
    nodeType: string;
    bulkScanId: string;
  };
};

type ControlActionDta = {
  message?: string;
  success: boolean;
};

type TabsType = {
  label: string;
  value: string;
};

export const CLOUDS = [
  ComplianceScanNodeTypeEnum.aws,
  ComplianceScanNodeTypeEnum.aws_org,
  ComplianceScanNodeTypeEnum.azure,
  ComplianceScanNodeTypeEnum.gcp,
  ComplianceScanNodeTypeEnum.gcp_org,
];

const isKubernetesNode = (nodeType: ComplianceScanNodeTypeEnum) =>
  nodeType == ComplianceScanNodeTypeEnum.kubernetes_cluster;

export const scanPostureApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ScanActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const nodeIds = body._nodeIds.toString().split(',');
  let nodeType = body._nodeType.toString();
  const checkTypes = body._checkTypes.toString().replace('SOC2', 'soc_2');

  const isCloudScan = CLOUDS.includes(nodeType as ComplianceScanNodeTypeEnum);
  if (isKubernetesNode(nodeType as ComplianceScanNodeTypeEnum)) {
    nodeType = 'cluster';
  } else if (isCloudScan) {
    nodeType = 'cloud_account';
  }

  const scheduleOn = formData.get('scheduleOn') === 'on';
  const scanImmediately = formData.get('scanImmediately') === 'on';
  const scheduleDescription = formData.get('scheduleDescription');
  const scheduleCron = `0 ${formData.get('scheduleCron')}`;

  const isPriorityScan = formData.get('isPriorityScan') === 'on';

  const requestBody: ModelComplianceScanTriggerReq = {
    benchmark_types: checkTypes.toLowerCase().split(','),
    filters: {
      cloud_account_scan_filter: { filter_in: null },
      kubernetes_cluster_scan_filter: { filter_in: null },
      container_scan_filter: { filter_in: null },
      host_scan_filter: { filter_in: null },
      image_scan_filter: { filter_in: null },
    },
    is_priority: isPriorityScan,
    node_ids: nodeIds.map((nodeId) => ({
      node_id: nodeId,
      node_type: nodeType as ModelNodeIdentifierNodeTypeEnum,
    })),
  };

  let scanResponse = {
    success: true,
    data: {
      bulkScanId: '',
      nodeType,
    },
  };
  if (!scheduleOn || scanImmediately) {
    const startComplianceScanApi = apiWrapper({
      fn: getComplianceApiClient().startComplianceScan,
    });
    const startComplianceScanResponse = await startComplianceScanApi({
      modelComplianceScanTriggerReq: requestBody,
    });

    if (!startComplianceScanResponse.ok) {
      if (
        startComplianceScanResponse.error.response.status === 400 ||
        startComplianceScanResponse.error.response.status === 409
      ) {
        const { message } = await getResponseErrors(startComplianceScanResponse.error);
        return {
          success: false,
          message,
        };
      } else if (startComplianceScanResponse.error.response.status === 403) {
        const message = await get403Message(startComplianceScanResponse.error);
        return {
          success: false,
          message,
        };
      } else if (startComplianceScanResponse.error.response.status >= 500) {
        console.error(startComplianceScanResponse.error);
        return {
          success: false,
          message: 'Something went wrong, please try again later.',
        };
      }
      throw startComplianceScanResponse.error;
    }

    scanResponse = {
      success: true,
      data: {
        bulkScanId: startComplianceScanResponse.value.bulk_scan_id,
        nodeType,
      },
    };
  }

  if (scheduleOn) {
    const addScheduledTaskApi = apiWrapper({
      fn: getSettingsApiClient().addScheduledTask,
    });
    const scheduleResponse = await addScheduledTaskApi({
      modelAddScheduledTaskRequest: {
        ...requestBody,
        scan_config: null,
        action: isCloudScan
          ? ModelScanResultsActionRequestScanTypeEnum.CloudComplianceScan
          : ModelScanResultsActionRequestScanTypeEnum.ComplianceScan,
        cron_expr: scheduleCron,
        description: scheduleDescription?.toString(),
      },
    });
    if (!scheduleResponse.ok) {
      if (
        scheduleResponse.error.response.status === 400 ||
        scheduleResponse.error.response.status === 409
      ) {
        const { message } = await getResponseErrors(scheduleResponse.error);
        return {
          success: false,
          message,
        };
      } else if (scheduleResponse.error.response.status === 403) {
        const message = await get403Message(scheduleResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw scheduleResponse.error;
    }
  }

  // schedule scan
  if (scheduleOn && scanImmediately) {
    toast.success('Scan started and scheduled successfully');
  } else if (scheduleOn) {
    toast.success('Scan scheduled successfully');
  } else {
    toast.success('Scan started successfully');
  }

  invalidateAllQueries();
  return scanResponse;
};

const toggleControls = ({
  nodeId,
  checked,
  controlIds,
  fetcher,
  checkType,
  nodeType,
}: {
  nodeId: string;
  checked: boolean;
  controlIds: string[] | undefined;
  fetcher: FetcherWithComponents<ControlActionDta>;
  checkType: string;
  nodeType: string;
}) => {
  if (!controlIds) {
    throw new Error('Control ids cannot be empty');
  }
  const formData = new FormData();
  formData.append('nodeId', nodeId);
  formData.append(
    'actionType',
    !checked ? ActionEnumType.DISABLE : ActionEnumType.ENABLE,
  );
  formData.append('enabled', checked.toString());
  controlIds.forEach((item) => formData.append('controlIds[]', item));
  fetcher.submit(formData, {
    method: 'post',
    action: generatePath('/data-component/list/controls/:nodeType/:checkType', {
      checkType,
      nodeType,
    }),
  });
};
const useGetControls = ({
  checkType,
  nodeType,
}: {
  checkType: string;
  nodeType: string;
}) => {
  return useSuspenseQuery({
    ...queries.posture.listControls({ checkTypes: [checkType], nodeType }),
  });
};

const ToggleControl = ({
  checked,
  controlId,
  nodeId,
  nodeType,
  checkType,
  fetcher,
}: {
  checked: boolean;
  controlId: string[];
  nodeId: string;
  nodeType: string;
  checkType: string;
  fetcher: FetcherWithComponents<ControlActionDta>;
}) => {
  // TODO: should show loader indicator here
  if (fetcher.state !== 'idle') {
    return <CircleSpinner size="sm" />;
  }
  return (
    <>
      <Switch
        checked={checked}
        onCheckedChange={(checked) => {
          toggleControls({
            checkType,
            checked,
            nodeType,
            nodeId,
            controlIds: controlId,
            fetcher,
          });
        }}
      />
    </>
  );
};
const ControlTable = ({
  nodeType,
  selectedTab,
  nodeIds,
}: {
  nodeType: string;
  selectedTab: string;
  nodeIds: string[];
}) => {
  // TODO: remove this once we have correct type from api
  const _nodeType = useMemo(() => {
    switch (nodeType) {
      case ComplianceScanNodeTypeEnum.host:
        return 'linux';
      case ComplianceScanNodeTypeEnum.kubernetes_cluster:
        return 'kubernetes';
      case ComplianceScanNodeTypeEnum.aws_org:
        return ComplianceScanNodeTypeEnum.aws;
      case ComplianceScanNodeTypeEnum.gcp_org:
        return ComplianceScanNodeTypeEnum.gcp;

      default:
        return nodeType;
    }
  }, [nodeType]);
  const fetcher = useFetcher();
  const [pageSize, setPageSize] = useState(10);
  const { data } = useGetControls({
    checkType: selectedTab === 'SOC2' ? 'soc_2' : selectedTab.toLowerCase(),
    nodeType: _nodeType,
  });
  const columnHelper = createColumnHelper<ModelCloudNodeComplianceControl>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('enabled', {
        enableSorting: false,
        header: () => null,
        cell: (info) => {
          return (
            <ToggleControl
              nodeId={nodeIds[0]}
              nodeType={_nodeType}
              checkType={selectedTab.toLowerCase()}
              checked={!!info.row.original.enabled}
              controlId={info.row.original?.node_id ? [info.row.original.node_id] : ['']}
              fetcher={fetcher}
            />
          );
        },
        minSize: 30,
        size: 40,
        maxSize: 60,
      }),
      columnHelper.accessor('category_hierarchy_short', {
        id: 'category',
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <span>Category</span>,
        maxSize: 130,
        size: 100,
        minSize: 80,
      }),
      columnHelper.accessor('title', {
        header: () => 'Description',
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        maxSize: 160,
        size: 150,
        minSize: 140,
      }),
    ],
    [selectedTab],
  );
  return (
    <>
      {data.message ? (
        <p className="text-status-error text-p7 p-3">{data.message}</p>
      ) : null}
      <Table
        size="compact"
        data={data.controls}
        columns={columns}
        enablePagination
        enableColumnResizing
        enableSorting
        enablePageResize
        pageSize={pageSize}
        onPageResize={(newSize) => {
          setPageSize(newSize);
        }}
      />
    </>
  );
};
export const ControlsTable = memo(
  ({
    nodeIds,
    nodeType,
    setSelectedCheckTypes,
    selectedCheckTypes,
  }: {
    nodeIds: string[];
    nodeType: string;
    selectedCheckTypes: string[];
    setSelectedCheckTypes: React.Dispatch<React.SetStateAction<string[]>>;
  }) => {
    const tabs = useMemo<TabsType[] | []>(() => {
      return complianceType[nodeType as keyof typeof complianceType]?.map((value) => {
        return {
          label: value,
          value: value,
        };
      });
    }, [nodeType]);
    const [selectedTab, setSelectedTab] = useState(tabs[0].value);

    const isCheckTypeEnabled = useMemo(() => {
      return selectedCheckTypes.includes(selectedTab);
    }, [selectedTab, selectedCheckTypes]);

    return (
      <div>
        <>
          {nodeIds.length === 1 ? (
            <Tabs
              value={selectedTab}
              tabs={tabs}
              onValueChange={(v) => setSelectedTab(v)}
            >
              <>
                <div className="mt-4">
                  <Switch
                    checked={isCheckTypeEnabled}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        selectedCheckTypes.push(selectedTab);
                        setSelectedCheckTypes([...selectedCheckTypes]);
                      } else {
                        const types = selectedCheckTypes.filter((checkType) => {
                          return checkType !== selectedTab;
                        });
                        setSelectedCheckTypes(types);
                      }
                    }}
                    label={`Enable ${selectedTab}`}
                  />
                </div>
                <div
                  className={cn('relative mt-4', {
                    'pointer-events-none': !isCheckTypeEnabled,
                  })}
                >
                  <Suspense
                    fallback={
                      <TableSkeleton
                        columns={3}
                        rows={10}
                        size={'compact'}
                        className="mt-4"
                      />
                    }
                  >
                    <ControlTable
                      nodeType={nodeType}
                      nodeIds={nodeIds}
                      selectedTab={selectedTab}
                    />
                    {!isCheckTypeEnabled ? (
                      <div className="inset-0 bg-bg-left-nav/70 absolute pointer-events-none"></div>
                    ) : null}
                  </Suspense>
                </div>
              </>
            </Tabs>
          ) : null}
        </>
      </div>
    );
  },
);

export const ComplianceScanConfigureForm = ({
  showAdvancedOptions,
  showScheduleScanOptions,
  onSuccess,
  data,
  onCancel,
}: ComplianceScanConfigureFormProps) => {
  const fetcher = useFetcher();
  const { nodeType, nodeIds } = data;
  const { state, data: fetcherData } = fetcher;
  const [selectedCheckTypes, setSelectedCheckTypes] = useState<string[]>(() => {
    return complianceType[nodeType as keyof typeof complianceType]?.map((value) => {
      return value;
    });
  });

  useEffect(() => {
    let data = undefined;
    if (fetcherData?.success && state === 'idle') {
      if (fetcher.data) {
        data = fetcher.data.data;
      }
      onSuccess(data);
    }
  }, [fetcherData, state]);

  return (
    <>
      <fetcher.Form
        className="flex flex-col -pt-4"
        method="post"
        action="/data-component/scan/posture"
      >
        <input
          type="text"
          name="_checkTypes"
          readOnly
          hidden
          value={selectedCheckTypes}
        />

        <input type="text" name="_nodeIds" hidden readOnly value={nodeIds.join(',')} />
        <input type="text" name="_nodeType" readOnly hidden value={nodeType} />
        {showAdvancedOptions && (
          <Suspense
            fallback={
              <div>
                <div className="animate-pulse dark:bg-bg-grid-default mt-4 h-4 w-14 rounded-md"></div>
                <TableSkeleton columns={3} rows={10} size={'compact'} className="mt-8" />
              </div>
            }
          >
            <ControlsTable
              nodeIds={data.nodeIds}
              nodeType={nodeType}
              setSelectedCheckTypes={setSelectedCheckTypes}
              selectedCheckTypes={selectedCheckTypes}
            />
          </Suspense>
        )}
        {nodeIds.length > 1 ? (
          <span className="text-p4 text-text-text-and-icon">
            Click on start scan to find compliance issues
          </span>
        ) : null}

        {!isCloudNode(nodeType) &&
        !isCloudOrgNode(nodeType) &&
        !isKubernetesNode(nodeType) ? (
          <div className="flex flex-col gap-y-2 mt-4">
            <h6 className={'text-p3 text-text-text-and-icon'}>Priority scan</h6>
            <Checkbox name="isPriorityScan" label="Priority scan" />
          </div>
        ) : null}

        {showScheduleScanOptions && <ScheduleScanForm />}

        <div className="flex gap-3 mt-10">
          <Button
            disabled={selectedCheckTypes.length === 0 || state !== 'idle'}
            loading={state !== 'idle'}
            size="sm"
            type="submit"
          >
            Start Scan
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={() => onCancel?.()}>
              Cancel
            </Button>
          ) : null}
        </div>
        {fetcherData?.message && (
          <p className="text-status-error text-p7a py-3">{fetcherData.message}</p>
        )}
      </fetcher.Form>
    </>
  );
};
