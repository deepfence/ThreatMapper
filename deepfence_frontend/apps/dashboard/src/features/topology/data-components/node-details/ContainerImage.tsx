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
import { ContainerTable } from '@/features/topology/components/node-details/SummaryTables';
import { ScanResult } from '@/features/topology/components/scan-results/ScanResult';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

function useLookupContainerImage(nodeId: string) {
  return useSuspenseQuery({
    ...queries.lookup.containerImage({ nodeId }),
  });
}

interface ContainerImageModalProps {
  nodeId: string;
  defaultTab?: string;
}

export const ContainerImage = (props: ContainerImageModalProps) => {
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
      label: 'Containers',
      value: 'containers',
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
            nodeType="container_image"
            availableScanTypes={[]}
            showInstallAgentOption={false}
          />
        }
      >
        <ContainerImageHeader {...props} />
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

const ContainerImageHeader = ({ nodeId }: ContainerImageModalProps) => {
  const { data } = useLookupContainerImage(nodeId);
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  return (
    <>
      <Header
        onStartScanClick={setScanOptions}
        nodeId={nodeId}
        label={data.imageData?.node_name}
        nodeType="container_image"
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
  const { data } = useLookupContainerImage(nodeId);
  return (
    <div className="p-5 flex flex-col gap-x-4 gap-y-7 dark:bg-bg-side-panel bg-white">
      {tab === 'metadata' && (
        <Metadata
          data={{
            node_name: toTopologyMetadataString(data?.imageData?.node_name),
            docker_image_name: toTopologyMetadataString(
              data?.imageData?.docker_image_name,
            ),
            docker_image_tag: toTopologyMetadataString(data?.imageData?.docker_image_tag),
            docker_image_size: toTopologyMetadataString(
              data?.imageData?.docker_image_size,
            ),
            docker_image_created_at: toTopologyMetadataString(
              data?.imageData?.docker_image_created_at,
            ),
            docker_image_id: toTopologyMetadataString(data?.imageData?.docker_image_id),
          }}
        />
      )}

      {tab === 'containers' && (
        <>
          <ContainerTable containers={data?.imageData?.containers ?? []} />
        </>
      )}
      {tab === 'scan-results' && (
        <ScanResult
          vulnerabilityScanId={data.imageData.vulnerability_latest_scan_id}
          secretScanId={data.imageData.secret_latest_scan_id}
          malwareScanId={data.imageData.malware_latest_scan_id}
          vulnerabilityScanStatus={data.imageData.vulnerability_scan_status}
          secretScanStatus={data.imageData.secret_scan_status}
          malwareScanStatus={data.imageData.malware_scan_status}
        />
      )}
    </div>
  );
};
