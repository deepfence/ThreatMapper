import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { ModelContainer } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import { ProcessTable } from '@/features/topology/components/node-details/SummaryTables';
import {
  getMalwareScanCounts,
  getSecretScanCounts,
  getVulnerabilityScanCounts,
} from '@/features/topology/components/scan-results/loaderHelpers';
import { ScanResult } from '@/features/topology/components/scan-results/ScanResult';
import { ApiError, makeRequest } from '@/utils/api';

type LoaderData = {
  containerData: ModelContainer;
  vulnerabilityScanCounts: Awaited<ReturnType<typeof getVulnerabilityScanCounts>>;
  secretScanCounts: Awaited<ReturnType<typeof getSecretScanCounts>>;
  malwareScanCounts: Awaited<ReturnType<typeof getMalwareScanCounts>>;
};

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const nodeId = params.nodeId;

  if (!nodeId) {
    throw new Error('nodeId is required');
  }
  const lookupResult = await makeRequest({
    apiFunction: getLookupApiClient().lookupContainer,
    apiArgs: [
      {
        lookupLookupFilter: {
          node_ids: [nodeId],
          in_field_filter: null,
          window: {
            offset: 0,
            size: 1,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(lookupResult)) {
    throw new Error(`Failed to load host: ${nodeId}`);
  }

  return {
    containerData: lookupResult[0],
    vulnerabilityScanCounts: await getVulnerabilityScanCounts(
      lookupResult[0].vulnerability_latest_scan_id,
    ),
    secretScanCounts: await getSecretScanCounts(lookupResult[0].secret_latest_scan_id),
    malwareScanCounts: await getMalwareScanCounts(lookupResult[0].malware_latest_scan_id),
  };
};

export const Container = ({
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
    fetcher.load(generatePath('/topology/node-details/container/:nodeId', { nodeId }));
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
      label: 'Processes',
      value: 'processes',
    },
  ];

  const header = (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      nodeType="container"
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
              <>
                <Metadata
                  data={{
                    node_name: toTopologyMetadataString(
                      fetcher.data?.containerData?.node_name,
                    ),
                    docker_container_name: toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_container_name,
                    ),
                    host_name: toTopologyMetadataString(
                      fetcher.data?.containerData?.host_name,
                    ),
                    uptime: toTopologyMetadataString(fetcher.data?.containerData?.uptime),
                    docker_container_command: toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_container_command,
                    ),
                    docker_container_state_human: toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_container_state_human,
                    ),
                    docker_container_network_mode: toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_container_network_mode,
                    ),
                    docker_container_networks: toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_container_networks,
                    ),
                    docker_container_ips: toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_container_ips,
                    ),
                    docker_container_created: toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_container_created,
                    ),
                    docker_container_ports: toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_container_ports,
                    ),
                  }}
                />
                <Metadata
                  title="Image details"
                  data={{
                    id: toTopologyMetadataString(
                      fetcher.data?.containerData?.image?.node_id,
                    ),
                    name: toTopologyMetadataString(
                      fetcher.data?.containerData?.image?.docker_image_name,
                    ),
                    tag: toTopologyMetadataString(
                      fetcher.data?.containerData?.image?.docker_image_tag,
                    ),
                    size: toTopologyMetadataString(
                      fetcher.data?.containerData?.image?.docker_image_size,
                    ),
                    created_at: toTopologyMetadataString(
                      fetcher.data?.containerData?.image?.docker_image_created_at,
                    ),
                  }}
                />
                <Metadata
                  title="Docker labels"
                  data={Object.keys(
                    fetcher.data?.containerData?.docker_labels ?? {},
                  ).reduce<Record<string, string | boolean>>((prev, key) => {
                    prev[key] = toTopologyMetadataString(
                      fetcher.data?.containerData?.docker_labels?.[key],
                    );
                    return prev;
                  }, {})}
                />
              </>
            )}
            {tab === 'scan-results' && (
              <ScanResult
                vulnerabilityScanStatus={
                  fetcher.data?.containerData?.vulnerability_scan_status
                }
                secretScanStatus={fetcher.data?.containerData?.secret_scan_status}
                malwareScanStatus={fetcher.data?.containerData?.malware_scan_status}
                vulnerabilityScanSummary={fetcher.data?.vulnerabilityScanCounts}
                secretScanSummary={fetcher.data?.secretScanCounts}
                malwareScanSummary={fetcher.data?.malwareScanCounts}
              />
            )}
            {tab === 'processes' && (
              <ProcessTable
                processes={fetcher.data?.containerData.processes ?? []}
                onNodeClick={onNodeClick}
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
