import { filter, find } from 'lodash-es';
import { useEffect, useState } from 'react';
import { HiMinusCircle, HiPlusCircle } from 'react-icons/hi';
import { useFetcher } from 'react-router-dom';
import { Button, TableSkeleton, Tabs } from 'ui-components';

import { ControlsTable } from '@/features/postures/components/ControlsTable';
import { useGetControlsList } from '@/features/postures/data-component/listControlsApiLoader';

type ScanConfigureFormProps = {
  loading: boolean;
  hideTable: boolean;
  accountData: {
    urlIds: string[];
    urlType: string;
  };
};
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

type TabsType = {
  label: string;
  value: string;
};

const hasTypeSelected = (prevTabs: TabsType[], value: string) => {
  return find(prevTabs, ['value', value]);
};

export const ScanConfigureForm = ({
  loading,
  accountData,
  hideTable = true,
}: ScanConfigureFormProps) => {
  const fetcher = useFetcher();
  const nodeType = accountData.urlType as ComplianceType;

  const [selectedTab, setSelectedTab] = useState('');
  const { controls: controlsList, status, load: fetchControls } = useGetControlsList();

  const isLoading = status === 'loading';
  const [tabs, setTabs] = useState<TabsType[] | []>(() => {
    return complianceType[nodeType].map((value) => {
      return {
        label: value,
        value: value,
      };
    });
  });

  useEffect(() => {
    if (selectedTab) {
      fetchControls(selectedTab.toLowerCase());
    }
  }, [selectedTab]);

  useEffect(() => {
    // set selected tab by last checktype
    if (tabs.length > 0) {
      setSelectedTab(tabs[tabs.length - 1].value);
    } else {
      setSelectedTab('');
    }
  }, [tabs]);

  const onScanTypeSelection = (name: string) => {
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
    <div>
      <div className="mt-6 flex gap-4 mb-6">
        {complianceType[nodeType]?.map((type: string) => (
          <Button
            color="primary"
            outline={hasTypeSelected(tabs, type) ? false : true}
            size="xs"
            key={type}
            onClick={() => {
              onScanTypeSelection(type);
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
          <input
            type="text"
            name="_nodeIds"
            hidden
            readOnly
            value={accountData.urlIds.join(',')}
          />
          <input
            type="text"
            name="_nodeType"
            readOnly
            hidden
            value={accountData.urlType}
          />
          <Button
            disabled={loading}
            loading={loading}
            size="sm"
            color="primary"
            className="ml-auto"
            type="submit"
          >
            Start Scan
          </Button>
        </fetcher.Form>
      </div>
      {!hideTable && (
        <div className={'text-sm font-medium mt-4 dark:text-white'}>
          {selectedTab === '' ? (
            <p>Please select at least one compliance type to start your scan.</p>
          ) : (
            <Tabs
              value={selectedTab}
              tabs={tabs}
              onValueChange={(v) => setSelectedTab(v)}
            >
              {isLoading && controlsList.length === 0 ? (
                <TableSkeleton columns={3} rows={10} size={'md'} />
              ) : (
                <div className="h-full p-2 dark:text-white">
                  <ControlsTable
                    data={controlsList}
                    checkType={selectedTab.toLowerCase()}
                    nodeId={''}
                    loading={isLoading}
                  />
                </div>
              )}
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
};
