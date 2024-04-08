import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import { ProcessTable } from '@/features/topology/components/node-details/SummaryTables';
import { AvailabilityCharts } from '@/features/topology/components/scan-results/AvailabilityCharts';
import { ScanResult } from '@/features/topology/components/scan-results/ScanResult';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

function useLookupContainer(nodeId: string) {
  return useSuspenseQuery({
    ...queries.lookup.container({ nodeId }),
  });
}

interface ContainerModalProps {
  nodeId: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
  onTabChange: (defaultTab: string) => void;
  defaultTab?: string;
}

export const Container = (props: ContainerModalProps) => {
  const {
    nodeId,
    defaultTab,
    onGoBack,
    showBackBtn,
    onNodeClick,
    onStartScanClick,
    onTabChange,
  } = props;
  const [tab, setTab] = useState(defaultTab ?? 'metadata');

  const tabs = [
    {
      label: 'Overview',
      value: 'metadata',
    },
    {
      label: 'Security Scans',
      value: 'scan-results',
    },
    {
      label: 'Processes',
      value: 'processes',
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
            nodeType="container"
            onGoBack={onGoBack}
            showBackBtn={showBackBtn}
            availableScanTypes={[]}
            showInstallAgentOption={false}
          />
        }
      >
        <ContainerHeader {...props} />
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

const ContainerHeader = ({
  nodeId,
  onStartScanClick,
  onGoBack,
  showBackBtn,
}: ContainerModalProps) => {
  const { data } = useLookupContainer(nodeId);
  return (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      label={data.containerData.node_name}
      nodeType="container"
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
  const { data } = useLookupContainer(nodeId);
  return (
    <div className="p-5 flex flex-col gap-x-4 gap-y-7 dark:bg-bg-side-panel bg-white">
      {tab === 'metadata' && (
        <>
          <Metadata
            data={{
              node_name: toTopologyMetadataString(data?.containerData?.node_name),
              docker_container_name: toTopologyMetadataString(
                data?.containerData?.docker_container_name,
              ),
              host_name: toTopologyMetadataString(data?.containerData?.host_name),
              uptime: toTopologyMetadataString(data?.containerData?.uptime),
              docker_container_command: toTopologyMetadataString(
                data?.containerData?.docker_container_command,
              ),
              docker_container_state_human: toTopologyMetadataString(
                data?.containerData?.docker_container_state_human,
              ),
              docker_container_network_mode: toTopologyMetadataString(
                data?.containerData?.docker_container_network_mode,
              ),
              docker_container_networks: toTopologyMetadataString(
                data?.containerData?.docker_container_networks,
              ),
              docker_container_ips: toTopologyMetadataString(
                data?.containerData?.docker_container_ips,
              ),
              docker_container_created: toTopologyMetadataString(
                data?.containerData?.docker_container_created,
              ),
              docker_container_ports: toTopologyMetadataString(
                data?.containerData?.docker_container_ports,
              ),
            }}
          />
          <Metadata
            title="Image details"
            data={{
              id: toTopologyMetadataString(data?.containerData?.image?.node_id),
              name: toTopologyMetadataString(
                data?.containerData?.image?.docker_image_name,
              ),
              tag: toTopologyMetadataString(data?.containerData?.image?.docker_image_tag),
              size: toTopologyMetadataString(
                data?.containerData?.image?.docker_image_size,
              ),
              created_at: toTopologyMetadataString(
                data?.containerData?.image?.docker_image_created_at,
              ),
            }}
          />
          <Metadata
            title="Docker labels"
            data={Object.keys(data?.containerData?.docker_labels ?? {}).reduce<
              Record<string, string | boolean>
            >((prev, key) => {
              prev[key] = toTopologyMetadataString(
                data?.containerData?.docker_labels?.[key],
              );
              return prev;
            }, {})}
          />
        </>
      )}
      {tab === 'processes' && (
        <ProcessTable
          processes={data?.containerData.processes ?? []}
          onNodeClick={onNodeClick}
        />
      )}
      {tab === 'scan-results' && (
        <>
          <ScanResult
            vulnerabilityScanId={data.containerData.vulnerability_latest_scan_id}
            secretScanId={data.containerData.secret_latest_scan_id}
            malwareScanId={data.containerData.malware_latest_scan_id}
            vulnerabilityScanStatus={data.containerData.vulnerability_scan_status}
            secretScanStatus={data.containerData.secret_scan_status}
            malwareScanStatus={data.containerData.malware_scan_status}
          />
          <AvailabilityCharts
            cpuUsage={data.containerData.cpu_usage}
            cpuMax={data.containerData.cpu_max}
            memoryUsage={data.containerData.memory_usage}
            memoryMax={data.containerData.memory_max}
          />
        </>
      )}
    </div>
  );
};
