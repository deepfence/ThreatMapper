import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import {
  ConnectionsTable,
  ContainerTable,
  ImageTable,
  ProcessTable,
} from '@/features/topology/components/node-details/SummaryTables';
import { AvailabilityCharts } from '@/features/topology/components/scan-results/AvailabilityCharts';
import { ScanResult } from '@/features/topology/components/scan-results/ScanResult';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

function useLookupHost(nodeId: string) {
  return useSuspenseQuery({
    ...queries.lookup.host({ nodeIds: [nodeId] }),
  });
}

interface HostModalProps {
  nodeId: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
  onTabChange: (defaultTab: string) => void;
  defaultTab?: string;
}

export const Host = (props: HostModalProps) => {
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
      label: 'Connections & Processes',
      value: 'connections-and-processes',
    },
    {
      label: 'Containers & Images',
      value: 'containers-and-images',
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
            nodeType="host"
            onGoBack={onGoBack}
            showBackBtn={showBackBtn}
            availableScanTypes={[]}
            showInstallAgentOption={false}
          />
        }
      >
        <HostHeader {...props} />
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
                  <CircleSpinner size="lg" data-testid="nodeDetailsSpinnerId" />
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

const HostHeader = ({
  nodeId,
  onStartScanClick,
  onGoBack,
  showBackBtn,
}: HostModalProps & {
  agentRunning?: boolean;
}) => {
  const { data } = useLookupHost(nodeId);
  return (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      label={data.hostData[0].host_name}
      nodeType="host"
      onGoBack={onGoBack}
      showBackBtn={showBackBtn}
      availableScanTypes={
        data.hostData[0].agent_running
          ? [
              ScanTypeEnum.VulnerabilityScan,
              ScanTypeEnum.SecretScan,
              ScanTypeEnum.MalwareScan,
              ScanTypeEnum.ComplianceScan,
            ]
          : []
      }
      showInstallAgentOption={!data.hostData[0].agent_running}
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
  const { data } = useLookupHost(nodeId);
  return (
    <div className="p-5 flex flex-col gap-x-4 gap-y-7 dark:bg-bg-side-panel bg-white">
      {tab === 'metadata' && (
        <Metadata
          data={{
            node_name: toTopologyMetadataString(data.hostData[0].node_name),
            version: toTopologyMetadataString(data.hostData[0].version),
            instance_id: toTopologyMetadataString(data.hostData[0].instance_id),
            cloud_provider: toTopologyMetadataString(data.hostData[0].cloud_provider),
            cloud_region: toTopologyMetadataString(data.hostData[0].cloud_region),
            uptime: toTopologyMetadataString(data.hostData[0].uptime),
            is_console_vm: toTopologyMetadataString(data.hostData[0].is_console_vm),
            kernel_version: toTopologyMetadataString(data.hostData[0].kernel_version),
            os: toTopologyMetadataString(data.hostData[0].os),
            local_networks: toTopologyMetadataString(data.hostData[0].local_networks),

            local_cidr: toTopologyMetadataString(data.hostData[0].local_cidr),
            instance_type: toTopologyMetadataString(data.hostData[0].instance_type),
            public_ip: toTopologyMetadataString(data.hostData[0].public_ip),
            private_ip: toTopologyMetadataString(data.hostData[0].private_ip),
            availability_zone: toTopologyMetadataString(
              data.hostData[0].availability_zone,
            ),
            resource_group: toTopologyMetadataString(data.hostData[0].resource_group),
            agent_running: toTopologyMetadataString(data.hostData[0].agent_running),
          }}
        />
      )}
      {tab === 'connections-and-processes' && (
        <>
          <ProcessTable
            processes={data.hostData[0].processes ?? []}
            onNodeClick={onNodeClick}
          />
          <ConnectionsTable
            type="inbound"
            connections={data.hostData[0].inbound_connections ?? []}
          />
          <ConnectionsTable
            type="outbound"
            connections={data.hostData[0].outbound_connections ?? []}
          />
        </>
      )}
      {tab === 'containers-and-images' && (
        <>
          <ContainerTable
            containers={data?.hostData[0].containers ?? []}
            onNodeClick={onNodeClick}
          />
          <ImageTable
            images={data?.hostData[0].container_images ?? []}
            onNodeClick={onNodeClick}
          />
        </>
      )}
      {tab === 'scan-results' && (
        <>
          <ScanResult
            vulnerabilityScanId={data.hostData[0].vulnerability_latest_scan_id}
            secretScanId={data.hostData[0].secret_latest_scan_id}
            malwareScanId={data.hostData[0].malware_latest_scan_id}
            complianceScanId={data.hostData[0].compliance_latest_scan_id}
            vulnerabilityScanStatus={data.hostData[0].vulnerability_scan_status}
            secretScanStatus={data.hostData[0].secret_scan_status}
            malwareScanStatus={data.hostData[0].malware_scan_status}
            complianceScanStatus={data.hostData[0].compliance_scan_status}
          />
          <AvailabilityCharts
            cpuUsage={data.hostData[0].cpu_usage}
            cpuMax={data.hostData[0].cpu_max}
            memoryUsage={data.hostData[0].memory_usage}
            memoryMax={data.hostData[0].memory_max}
          />
        </>
      )}
    </div>
  );
};
