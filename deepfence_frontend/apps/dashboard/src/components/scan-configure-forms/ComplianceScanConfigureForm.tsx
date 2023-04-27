import { filter, find } from 'lodash-es';
import { useEffect, useState } from 'react';
import { memo, useMemo } from 'react';
import { ActionFunctionArgs, generatePath, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Checkbox, TableSkeleton, Tabs } from 'ui-components';
import { CircleSpinner, createColumnHelper, Switch, Table } from 'ui-components';

import { getComplianceApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { ModelCloudNodeComplianceControl } from '@/api/generated/models/ModelCloudNodeComplianceControl';
import {
  ActionEnumType,
  useGetControlsList,
} from '@/features/postures/data-component/listControlsApiLoader';
import { ComplianceScanNodeTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';

export const complianceType: {
  [key in ComplianceScanNodeTypeEnum]: string[];
} = {
  aws: ['CIS', 'NIST', 'PCI', 'HIPAA', 'SOC2', 'GDPR'],
  aws_org: ['CIS', 'NIST', 'PCI', 'HIPAA', 'SOC2', 'GDPR'],
  gcp: ['CIS'],
  azure: ['CIS', 'NIST', 'HIPAA'],
  host: ['HIPAA', 'GDPR', 'PCI', 'NIST'],
  kubernetes_cluster: ['NSA-CISA'],
};
export type ComplianceScanConfigureFormProps = {
  showAdvancedOptions: boolean;
  data: {
    nodeIds: string[];
    nodeType: ComplianceScanNodeTypeEnum;
  };
  onSuccess: (data?: { nodeType: string; bulkScanId: string }) => void;
};

export type ScanActionReturnType = {
  message?: string;
  success: boolean;
  data?: {
    nodeType: string;
    bulkScanId: string;
  };
};

type TabsType = {
  label: string;
  value: string;
};

export const CLOUDS = [
  ComplianceScanNodeTypeEnum.aws,
  ComplianceScanNodeTypeEnum.azure,
  ComplianceScanNodeTypeEnum.gcp,
];

export const scanPostureApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ScanActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const nodeIds = body._nodeIds.toString().split(',');
  let nodeType = body._nodeType.toString();
  const checkTypes = body._checkTypes.toString().replace('SOC2', 'soc_2');

  if (nodeType === ComplianceScanNodeTypeEnum.kubernetes_cluster) {
    nodeType = 'cluster';
  } else if (CLOUDS.includes(nodeType as ComplianceScanNodeTypeEnum)) {
    nodeType = 'cloud_account';
  }

  const r = await makeRequest({
    apiFunction: getComplianceApiClient().startComplianceScan,
    apiArgs: [
      {
        modelComplianceScanTriggerReq: {
          benchmark_types: checkTypes.toLowerCase().split(','),
          filters: {
            cloud_account_scan_filter: { filter_in: null },
            kubernetes_cluster_scan_filter: { filter_in: null },
            container_scan_filter: { filter_in: null },
            host_scan_filter: { filter_in: null },
            image_scan_filter: { filter_in: null },
          },
          node_ids: nodeIds.map((nodeId) => ({
            node_id: nodeId,
            node_type: nodeType as ModelNodeIdentifierNodeTypeEnum,
          })),
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ScanActionReturnType>({
        success: false,
      });
      if (r.status === 400 || r.status === 409) {
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
  toast('Scan has been sucessfully started');
  return {
    success: true,
    data: {
      bulkScanId: r.bulk_scan_id,
      nodeType,
    },
  };
};

const hasTypeSelected = (prevTabs: TabsType[], value: string) => {
  return find(prevTabs, ['value', value]);
};

const ToggleControl = ({
  checked,
  controlId,
  nodeId,
  nodeType,
  checkType,
  loading,
}: {
  checked: boolean;
  controlId: string;
  nodeId: string;
  nodeType: string;
  checkType: string;
  loading: boolean;
}) => {
  const fetcher = useFetcher();
  if (loading) {
    return <CircleSpinner size="sm" />;
  }

  return (
    <>
      <Switch
        checked={checked}
        size="sm"
        onCheckedChange={(checked) => {
          const formData = new FormData();
          formData.append('nodeId', nodeId);
          formData.append(
            'actionType',
            !checked ? ActionEnumType.DISABLE : ActionEnumType.ENABLE,
          );
          formData.append('enabled', checked.toString());
          formData.append('controlId', controlId ?? '');
          fetcher.submit(formData, {
            method: 'post',
            action: generatePath('/data-component/list/controls/:nodeType/:checkType', {
              checkType,
              nodeType,
            }),
          });
        }}
      />
    </>
  );
};
export const ControlsTable = memo(
  ({
    nodeIds,
    nodeType,
    tabs = [],
    defaultTab,
  }: {
    nodeIds: string[];
    nodeType: string;
    tabs: TabsType[];
    defaultTab: string;
  }) => {
    const [selectedTab, setSelectedTab] = useState(defaultTab);

    const { controls: controlsList, status, load: fetchControls } = useGetControlsList();
    const isLoading = status === 'loading';

    const columnHelper = createColumnHelper<ModelCloudNodeComplianceControl>();

    // TODO: remove this once we have correct type from api
    const _nodeType = useMemo(() => {
      switch (nodeType) {
        case ComplianceScanNodeTypeEnum.host:
          return 'linux';
        case ComplianceScanNodeTypeEnum.kubernetes_cluster:
          return 'kubernetes';
        default:
          return nodeType;
      }
    }, [nodeType]);

    const columns = useMemo(
      () => [
        columnHelper.accessor('category_hierarchy', {
          id: 'category',
          cell: (info) => info.getValue()?.toString(),
          header: () => <span>Category</span>,
          maxSize: 100,
          size: 120,
          minSize: 130,
        }),
        columnHelper.accessor('title', {
          header: () => 'Description',
          cell: (info) => info.renderValue(),
          maxSize: 140,
          size: 150,
          minSize: 160,
        }),
        columnHelper.accessor('enabled', {
          enableSorting: false,
          header: () => 'Status',
          cell: (info) => {
            return (
              <ToggleControl
                nodeId={nodeIds[0]}
                nodeType={_nodeType}
                loading={isLoading}
                checkType={selectedTab.toLowerCase()}
                checked={!!info.row.original.enabled}
                controlId={info.row.original.control_id ?? ''}
              />
            );
          },
          maxSize: 40,
          size: 50,
          minSize: 60,
        }),
      ],
      [selectedTab],
    );

    useEffect(() => {
      if (defaultTab) {
        setSelectedTab(defaultTab);
      }
    }, [defaultTab]);

    useEffect(() => {
      if (selectedTab) {
        const benchmarkType =
          selectedTab === 'SOC2' ? 'soc_2' : selectedTab.toLowerCase();
        fetchControls(benchmarkType, _nodeType);
      }
    }, [selectedTab]);

    return (
      <div className={'text-sm font-medium mt-4 dark:text-white'}>
        {selectedTab === '' ? (
          <p>Please select at least one compliance type to start your scan.</p>
        ) : (
          <>
            {nodeIds.length === 1 ? (
              <Tabs
                value={selectedTab}
                tabs={tabs}
                onValueChange={(v) => setSelectedTab(v)}
              >
                {isLoading && controlsList.length === 0 ? (
                  <TableSkeleton
                    columns={3}
                    rows={10}
                    size={'md'}
                    className={'w-screen'}
                  />
                ) : (
                  <Table
                    size="sm"
                    data={controlsList}
                    columns={columns}
                    enablePagination
                    enableColumnResizing
                    enableSorting
                  />
                )}
              </Tabs>
            ) : null}
          </>
        )}
      </div>
    );
  },
);

export const ComplianceScanConfigureForm = ({
  showAdvancedOptions,
  onSuccess,
  data,
}: ComplianceScanConfigureFormProps) => {
  const fetcher = useFetcher();
  const { nodeType, nodeIds } = data;
  const { state, data: fetcherData } = fetcher;
  const [tabs, setTabs] = useState<TabsType[] | []>(() => {
    return complianceType[nodeType].map((value) => {
      return {
        label: value,
        value: value,
      };
    });
  });
  const [defaultTab, setDefaultTab] = useState('');

  useEffect(() => {
    // set selected tab by last checktype
    if (tabs.length > 0) {
      setDefaultTab(tabs[tabs.length - 1].value);
    } else {
      setDefaultTab('');
    }
  }, [tabs]);

  useEffect(() => {
    let data = undefined;
    if (fetcherData?.success && state === 'idle') {
      if (fetcher.data) {
        data = fetcher.data.data;
      }
      onSuccess(data);
    }
  }, [fetcherData, state]);

  const onCheckTypeSelection = (name: string) => {
    setTabs((prevTabs) => {
      const found = hasTypeSelected(prevTabs, name);
      if (found) {
        const newType = filter(prevTabs, (tab: TabsType) => tab.value !== found.value);
        return [...newType];
      } else {
        const newType = [
          ...prevTabs,
          {
            label: name,
            value: name,
          },
        ];
        return newType;
      }
    });
  };

  return (
    <>
      <fetcher.Form
        className="flex gap-4"
        method="post"
        action="/data-component/scan/posture"
      >
        <input
          type="text"
          name="_checkTypes"
          readOnly
          hidden
          value={tabs.map((tab) => tab.value)}
        />
        {complianceType[nodeType]?.map((type: string) => (
          <Checkbox
            label={type}
            key={type}
            checked={tabs.find((tab) => tab.value === type) !== undefined}
            value={type}
            onCheckedChange={() => {
              onCheckTypeSelection(type);
            }}
          />
        ))}

        <input type="text" name="_nodeIds" hidden readOnly value={nodeIds.join(',')} />
        <input type="text" name="_nodeType" readOnly hidden value={nodeType} />

        <Button
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
          size="sm"
          color="primary"
          type="submit"
          className="ml-auto "
        >
          Start Scan
        </Button>
      </fetcher.Form>
      {fetcherData?.message && (
        <p className="text-red-500 text-sm py-3">{fetcherData.message}</p>
      )}
      {showAdvancedOptions && (
        <ControlsTable
          nodeIds={data.nodeIds}
          tabs={tabs}
          defaultTab={defaultTab}
          nodeType={nodeType}
        />
      )}
    </>
  );
};
