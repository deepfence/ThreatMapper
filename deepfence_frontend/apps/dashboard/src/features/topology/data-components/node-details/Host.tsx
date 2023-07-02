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

function useLookupHost(nodeId: string) {
  return useSuspenseQuery({
    ...queries.lookup.host({ nodeId }),
  });
}

interface HostModalProps {
  nodeId: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
}

export const Host = (props: HostModalProps) => {
  const { nodeId, onGoBack, showBackBtn, onNodeClick, onStartScanClick } = props;
  const [tab, setTab] = useState('metadata');
  const tabs = [
    {
      label: 'Overview',
      value: 'metadata',
    },
    {
      label: 'Monitoring',
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
          />
        }
      >
        <HostHeader {...props} />
      </Suspense>
      <SlidingModalContent>
        <div className="dark:bg-bg-breadcrumb-bar">
          <Tabs
            value={tab}
            defaultValue={tab}
            tabs={tabs}
            onValueChange={(v) => setTab(v)}
          >
            <Suspense
              fallback={
                <div className="min-h-[300px] flex items-center justify-center dark:bg-bg-side-panel">
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

const HostHeader = ({
  nodeId,
  onStartScanClick,
  onGoBack,
  showBackBtn,
}: HostModalProps) => {
  const { data } = useLookupHost(nodeId);
  return (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      label={data.hostData.host_name}
      nodeType="host"
      onGoBack={onGoBack}
      showBackBtn={showBackBtn}
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
    <div className="p-5 flex flex-col gap-x-4 gap-y-7 dark:bg-bg-side-panel">
      {tab === 'metadata' && (
        <Metadata
          data={{
            node_name: toTopologyMetadataString(data.hostData.node_name),
            version: toTopologyMetadataString(data.hostData.version),
            instance_id: toTopologyMetadataString(data.hostData.instance_id),
            cloud_provider: toTopologyMetadataString(data.hostData.cloud_provider),
            cloud_region: toTopologyMetadataString(data.hostData.cloud_region),
            uptime: toTopologyMetadataString(data.hostData.uptime),
            is_console_vm: toTopologyMetadataString(data.hostData.is_console_vm),
            kernel_version: toTopologyMetadataString(data.hostData.kernel_version),
            os: toTopologyMetadataString(data.hostData.os),
            local_networks: toTopologyMetadataString(data.hostData.local_networks),

            local_cidr: toTopologyMetadataString(data.hostData.local_cidr),
            instance_type: toTopologyMetadataString(data.hostData.instance_type),
            public_ip: toTopologyMetadataString(data.hostData.public_ip),
            private_ip: toTopologyMetadataString(data.hostData.private_ip),
            availability_zone: toTopologyMetadataString(data.hostData.availability_zone),
            resource_group: toTopologyMetadataString(data.hostData.resource_group),
          }}
        />
      )}
      {tab === 'connections-and-processes' && (
        <>
          <ProcessTable
            processes={data.hostData.processes ?? []}
            onNodeClick={onNodeClick}
          />
          <ConnectionsTable
            type="inbound"
            connections={data.hostData.inbound_connections ?? []}
          />
          <ConnectionsTable
            type="outbound"
            connections={data.hostData.outbound_connections ?? []}
          />
        </>
      )}
      {tab === 'containers-and-images' && (
        <>
          <ContainerTable
            containers={data?.hostData.containers ?? []}
            onNodeClick={onNodeClick}
          />
          <ImageTable
            images={data?.hostData.container_images ?? []}
            onNodeClick={onNodeClick}
          />
        </>
      )}
      {tab === 'scan-results' && (
        <>
          <ScanResult
            vulnerabilityScanId={data.hostData.vulnerability_latest_scan_id}
            secretScanId={data.hostData.secret_latest_scan_id}
            malwareScanId={data.hostData.malware_latest_scan_id}
            complianceScanId={data.hostData.compliance_latest_scan_id}
            vulnerabilityScanStatus={data.hostData.vulnerability_scan_status}
            secretScanStatus={data.hostData.secret_scan_status}
            malwareScanStatus={data.hostData.malware_scan_status}
            complianceScanStatus={data.hostData.compliance_scan_status}
          />
          <AvailabilityCharts
            cpuUsage={data.hostData.cpu_usage}
            cpuMax={data.hostData.cpu_max}
            memoryUsage={data.hostData.memory_usage}
            memoryMax={data.hostData.memory_max}
          />
        </>
      )}
    </div>
  );
};
