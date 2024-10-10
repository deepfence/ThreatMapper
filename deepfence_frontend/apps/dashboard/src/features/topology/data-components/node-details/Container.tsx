import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
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
  defaultTab?: string;
}

export const Container = (props: ContainerModalProps) => {
  const { nodeId, defaultTab } = props;
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
            onStartScanClick={() => {
              /** noop */
            }}
            nodeId={nodeId}
            label={nodeId}
            nodeType="container"
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
              <TabContent tab={tab} nodeId={nodeId} />
            </Suspense>
          </Tabs>
        </div>
      </SlidingModalContent>
    </>
  );
};

const ContainerHeader = ({ nodeId }: ContainerModalProps) => {
  const { data } = useLookupContainer(nodeId);
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  return (
    <>
      <Header
        onStartScanClick={setScanOptions}
        nodeId={nodeId}
        label={data.containerData.node_name}
        nodeType="container"
        availableScanTypes={[
          ScanTypeEnum.VulnerabilityScan,
          ScanTypeEnum.SecretScan,
          ScanTypeEnum.MalwareScan,
        ]}
        showInstallAgentOption={false}
      />
      {!!scanOptions && (
        <ConfigureScanModal
          open
          onOpenChange={() => setScanOptions(undefined)}
          scanOptions={scanOptions}
        />
      )}
    </>
  );
};

const TabContent = ({ tab, nodeId }: { tab: string; nodeId: string }) => {
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
        <ProcessTable processes={data?.containerData.processes ?? []} />
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
