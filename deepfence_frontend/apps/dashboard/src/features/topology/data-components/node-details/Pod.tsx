import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import { ContainerTable } from '@/features/topology/components/node-details/SummaryTables';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

function useLookupPod(nodeId: string) {
  return useSuspenseQuery({
    ...queries.lookup.pod({ nodeId }),
  });
}

interface PodModalProps {
  nodeId: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
  onTabChange: (defaultTab: string) => void;
  defaultTab?: string;
}

export const Pod = (props: PodModalProps) => {
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
    {
      label: 'Containers',
      value: 'containers',
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
            nodeType="pod"
            onGoBack={onGoBack}
            showBackBtn={showBackBtn}
            availableScanTypes={[]}
            showInstallAgentOption={false}
          />
        }
      >
        <PodHeader {...props} />
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

const PodHeader = ({
  nodeId,
  onStartScanClick,
  onGoBack,
  showBackBtn,
}: PodModalProps) => {
  const { data } = useLookupPod(nodeId);
  return (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      label={data?.podData?.node_name}
      nodeType="pod"
      onGoBack={onGoBack}
      showBackBtn={showBackBtn}
      availableScanTypes={[
        ScanTypeEnum.VulnerabilityScan,
        ScanTypeEnum.SecretScan,
        ScanTypeEnum.MalwareScan,
      ]}
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
  const { data } = useLookupPod(nodeId);
  return (
    <div className="p-5 flex flex-col gap-x-4 gap-y-7 dark:bg-bg-side-panel bg-white">
      {tab === 'metadata' && (
        <Metadata
          data={{
            node_name: toTopologyMetadataString(data?.podData?.node_name),
            kubernetes_namespace: toTopologyMetadataString(
              data?.podData?.kubernetes_namespace,
            ),
            host_name: toTopologyMetadataString(data?.podData?.host_name),
            kubernetes_cluster_name: toTopologyMetadataString(
              data?.podData?.kubernetes_cluster_name,
            ),
            kubernetes_cluster_id: toTopologyMetadataString(
              data?.podData?.kubernetes_cluster_id,
            ),
            kubernetes_state: toTopologyMetadataString(data?.podData?.kubernetes_state),
            kubernetes_ip: toTopologyMetadataString(data?.podData?.kubernetes_ip),
            kubernetes_is_in_host_network: toTopologyMetadataString(
              data?.podData?.kubernetes_is_in_host_network,
            ),
          }}
        />
      )}
      {tab === 'containers' && (
        <>
          <ContainerTable
            containers={data?.podData?.containers ?? []}
            onNodeClick={onNodeClick}
          />
        </>
      )}
    </div>
  );
};
