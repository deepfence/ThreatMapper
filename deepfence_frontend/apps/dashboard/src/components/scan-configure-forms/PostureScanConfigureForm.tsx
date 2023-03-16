import { filter, find } from 'lodash-es';
import { useEffect, useState } from 'react';
import { memo, useMemo } from 'react';
import { HiMinusCircle, HiPlusCircle } from 'react-icons/hi';
import { generatePath, useFetcher } from 'react-router-dom';
import { Button, TableSkeleton, Tabs } from 'ui-components';
import { CircleSpinner, createColumnHelper, Switch, Table } from 'ui-components';

import { ModelCloudNodeComplianceControl } from '@/api/generated/models/ModelCloudNodeComplianceControl';
import {
  ActionEnumType,
  useGetControlsList,
} from '@/features/postures/data-component/listControlsApiLoader';

export type ComplianceType = 'aws' | 'gcp' | 'azure' | 'host' | 'kubernetes_cluster';

export const complianceType: {
  [key in ComplianceType]: string[];
} = {
  aws: ['CIS', 'NIST', 'PCI', 'HIPAA', 'SOC2', 'GDPR'],
  gcp: ['CIS'],
  azure: ['CIS', 'NIST', 'HIPAA'],
  host: ['HIPAA', 'GDPR', 'PCI', 'NIST'],
  kubernetes_cluster: ['NSA-CISA'],
};
type ScanConfigureFormProps = {
  wantAdvanceOptions: boolean;
  data: {
    nodeIds: string[];
    images: string[];
    nodeType: ComplianceType;
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

const hasTypeSelected = (prevTabs: TabsType[], value: string) => {
  return find(prevTabs, ['value', value]);
};

const ToggleControl = ({
  checked,
  controlId,
  nodeId,
  checkType,
  loading,
}: {
  checked: boolean;
  controlId: string;
  nodeId: string;
  checkType: string;
  loading: boolean;
}) => {
  const fetcher = useFetcher();
  if (loading) {
    return <CircleSpinner size="sm" />;
  }

  return (
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
          action: generatePath('/data-component/list/controls/:checkType', {
            checkType,
          }),
        });
      }}
    />
  );
};
export const ControlsTable = memo(
  ({
    nodeId,
    tabs = [],
    defaultTab,
  }: {
    nodeId: string;
    tabs: TabsType[];
    defaultTab: string;
  }) => {
    const [selectedTab, setSelectedTab] = useState(defaultTab);

    const { controls: controlsList, status, load: fetchControls } = useGetControlsList();
    const isLoading = status === 'loading';

    const columnHelper = createColumnHelper<ModelCloudNodeComplianceControl>();

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
                nodeId={nodeId}
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
      [],
    );

    useEffect(() => {
      if (defaultTab) {
        setSelectedTab(defaultTab);
      }
    }, [defaultTab]);

    useEffect(() => {
      if (selectedTab) {
        fetchControls(selectedTab.toLowerCase());
      }
    }, [selectedTab]);

    return (
      <div className={'text-sm font-medium mt-4 dark:text-white'}>
        {selectedTab === '' ? (
          <p>Please select at least one compliance type to start your scan.</p>
        ) : (
          <Tabs value={selectedTab} tabs={tabs} onValueChange={(v) => setSelectedTab(v)}>
            {isLoading && controlsList.length === 0 ? (
              <TableSkeleton columns={3} rows={10} size={'md'} />
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
        )}
      </div>
    );
  },
);

export const PostureScanConfigureForm = ({
  wantAdvanceOptions,
  onSuccess,
  data,
}: ScanConfigureFormProps) => {
  const fetcher = useFetcher();
  const { nodeType, nodeIds } = data;

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
      <div className="mt-6 flex gap-4 mb-6">
        {complianceType[nodeType]?.map((type: string) => (
          <Button
            color="primary"
            outline={hasTypeSelected(tabs, type) ? false : true}
            size="xs"
            key={type}
            onClick={() => {
              onCheckTypeSelection(type);
            }}
            endIcon={hasTypeSelected(tabs, type) ? <HiMinusCircle /> : <HiPlusCircle />}
            className="self-start"
            name={`${type}[]`}
            value={type}
          >
            {type}
          </Button>
        ))}
        <fetcher.Form method="post" className="self-start ml-auto">
          <input type="text" name="_nodeIds" hidden readOnly value={nodeIds.join(',')} />
          <input type="text" name="_nodeType" readOnly hidden value={nodeType} />
          <Button
            // disabled={loading}
            // loading={loading}
            size="sm"
            color="primary"
            className="ml-auto"
            type="submit"
          >
            Start Scan
          </Button>
        </fetcher.Form>
      </div>
      {wantAdvanceOptions && (
        <ControlsTable nodeId={''} tabs={tabs} defaultTab={defaultTab} />
      )}
    </>
  );
};
