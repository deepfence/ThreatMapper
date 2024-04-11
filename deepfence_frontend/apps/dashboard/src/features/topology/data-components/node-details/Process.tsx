import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import { queries } from '@/queries';

function useLookupProcess(nodeId: string) {
  return useSuspenseQuery({
    ...queries.lookup.process({ nodeId }),
  });
}

interface ProcessModalProps {
  nodeId: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
  onTabChange: (defaultTab: string) => void;
  defaultTab?: string;
}

export const Process = (props: ProcessModalProps) => {
  const {
    nodeId,
    defaultTab,
    onGoBack,
    showBackBtn,
    onStartScanClick,
    onNodeClick,
    onTabChange,
  } = props;
  const [tab, setTab] = useState(defaultTab ?? 'metadata');

  const tabs = [
    {
      label: 'Overview',
      value: 'metadata',
    },
  ];

  return (
    <>
      <Suspense
        fallback={
          <Header
            onStartScanClick={onStartScanClick}
            nodeId={nodeId}
            label={nodeId}
            nodeType="process"
            onGoBack={onGoBack}
            showBackBtn={showBackBtn}
            availableScanTypes={[]}
            showInstallAgentOption={false}
          />
        }
      >
        <ProcessHeader {...props} />
      </Suspense>
      <SlidingModalContent>
        <div className="dark:bg-bg-header bg-bg-breadcrumb-bar">
          <Tabs
            value={tab}
            defaultValue={tab}
            tabs={tabs}
            onValueChange={(v) => {
              onTabChange(v);
              setTab(v);
            }}
          >
            <Suspense
              fallback={
                <div className="min-h-[300px] flex items-center justify-center dark:bg-bg-side-panel bg-white">
                  <CircleSpinner size="lg" />
                </div>
              }
            >
              <TabContent tab={tab} nodeId={nodeId} onNodeClick={onNodeClick} />
            </Suspense>
          </Tabs>
        </div>
      </SlidingModalContent>
    </>
  );
};

const ProcessHeader = ({
  nodeId,
  onStartScanClick,
  onGoBack,
  showBackBtn,
}: ProcessModalProps) => {
  const { data } = useLookupProcess(nodeId);
  return (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      label={data?.processData?.node_name}
      nodeType="process"
      onGoBack={onGoBack}
      showBackBtn={showBackBtn}
      availableScanTypes={[]}
      showInstallAgentOption={false}
    />
  );
};

const TabContent = ({
  tab,
  nodeId,
  onNodeClick,
}: {
  tab: string;
  nodeId: string;
  onNodeClick: (nodeId: string, nodeType: string) => void;
}) => {
  const { data } = useLookupProcess(nodeId);
  return (
    <div className="p-5 flex flex-col gap-x-4 gap-y-7 dark:bg-bg-side-panel bg-white">
      {tab === 'metadata' && (
        <Metadata
          data={{
            node_name: toTopologyMetadataString(data?.processData?.node_name),
            pid: toTopologyMetadataString(data?.processData?.pid),
            ppid: toTopologyMetadataString(data?.processData?.ppid),
            cmdline: toTopologyMetadataString(data?.processData?.cmdline),
            threads: toTopologyMetadataString(data?.processData?.threads),
          }}
        />
      )}
    </div>
  );
};
