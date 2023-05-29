import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { ModelContainerImage } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import { ContainerTable } from '@/features/topology/components/node-details/SummaryTables';
import {
  getMalwareScanCounts,
  getSecretScanCounts,
  getVulnerabilityScanCounts,
} from '@/features/topology/components/scan-results/loaderHelpers';
import { ScanResult } from '@/features/topology/components/scan-results/ScanResult';
import { apiWrapper } from '@/utils/api';

export type LoaderData = {
  imageData: ModelContainerImage;
  vulnerabilityScanCounts: Awaited<ReturnType<typeof getVulnerabilityScanCounts>>;
  secretScanCounts: Awaited<ReturnType<typeof getSecretScanCounts>>;
  malwareScanCounts: Awaited<ReturnType<typeof getMalwareScanCounts>>;
};

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const nodeId = params.nodeId;

  if (!nodeId) {
    throw new Error('nodeId is required');
  }

  const lookupImageApi = apiWrapper({
    fn: getLookupApiClient().lookupImage,
  });
  const lookupResult = await lookupImageApi({
    lookupLookupFilter: {
      node_ids: [nodeId],
      in_field_filter: null,
      window: {
        offset: 0,
        size: 1,
      },
    },
  });
  if (!lookupResult.ok || !lookupResult.value.length) {
    throw new Error(`Failed to load host: ${nodeId}`);
  }

  return {
    imageData: lookupResult.value[0],
    vulnerabilityScanCounts: await getVulnerabilityScanCounts(
      lookupResult.value[0].vulnerability_latest_scan_id,
    ),
    secretScanCounts: await getSecretScanCounts(
      lookupResult.value[0].secret_latest_scan_id,
    ),
    malwareScanCounts: await getMalwareScanCounts(
      lookupResult.value[0].malware_latest_scan_id,
    ),
  };
};

export const ContainerImage = ({
  nodeId,
  onGoBack,
  showBackBtn,
  onNodeClick,
  onStartScanClick,
}: {
  nodeId: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
}) => {
  const fetcher = useFetcher<LoaderData>();
  const [tab, setTab] = useState('metadata');

  useEffect(() => {
    fetcher.load(
      generatePath('/topology/node-details/container_image/:nodeId', { nodeId }),
    );
  }, [nodeId]);

  const tabs = [
    {
      label: 'Metadata',
      value: 'metadata',
    },
    {
      label: 'Scan Results',
      value: 'scan-results',
    },
    {
      label: 'Containers',
      value: 'containers',
    },
  ];

  const header = (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      label={fetcher.data?.imageData?.node_name}
      nodeType="container_image"
      onGoBack={onGoBack}
      showBackBtn={showBackBtn}
    />
  );

  if (fetcher.state === 'loading' && !fetcher.data) {
    return (
      <>
        {header}
        <SlidingModalContent>
          <div className="h-full flex items-center justify-center">
            <CircleSpinner />
          </div>
        </SlidingModalContent>
      </>
    );
  }

  return (
    <>
      {header}
      <SlidingModalContent>
        <Tabs
          value={tab}
          defaultValue={tab}
          tabs={tabs}
          onValueChange={(v) => setTab(v)}
          variant="tab"
        >
          <div className="pt-6 flex flex-col gap-6">
            {tab === 'metadata' && (
              <Metadata
                data={{
                  node_name: toTopologyMetadataString(fetcher.data?.imageData?.node_name),
                  docker_image_name: toTopologyMetadataString(
                    fetcher.data?.imageData?.docker_image_name,
                  ),
                  docker_image_tag: toTopologyMetadataString(
                    fetcher.data?.imageData?.docker_image_tag,
                  ),
                  docker_image_size: toTopologyMetadataString(
                    fetcher.data?.imageData?.docker_image_size,
                  ),
                  docker_image_created_at: toTopologyMetadataString(
                    fetcher.data?.imageData?.docker_image_created_at,
                  ),
                  docker_image_id: toTopologyMetadataString(
                    fetcher.data?.imageData?.docker_image_id,
                  ),
                }}
              />
            )}
            {tab === 'containers' && (
              <>
                <ContainerTable
                  containers={fetcher.data?.imageData?.containers ?? []}
                  onNodeClick={onNodeClick}
                />
              </>
            )}
            {tab === 'scan-results' && (
              <ScanResult
                vulnerabilityScanStatus={
                  fetcher.data?.imageData?.vulnerability_scan_status
                }
                secretScanStatus={fetcher.data?.imageData?.secret_scan_status}
                malwareScanStatus={fetcher.data?.imageData?.malware_scan_status}
                vulnerabilityScanSummary={fetcher.data?.vulnerabilityScanCounts}
                secretScanSummary={fetcher.data?.secretScanCounts}
                malwareScanSummary={fetcher.data?.malwareScanCounts}
              />
            )}
          </div>
        </Tabs>
      </SlidingModalContent>
    </>
  );
};

export const module = {
  loader,
};
