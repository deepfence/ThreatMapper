import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { ModelHost } from '@/api/generated';
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
import {
  getComplianceScanCounts,
  getMalwareScanCounts,
  getSecretScanCounts,
  getVulnerabilityScanCounts,
} from '@/features/topology/components/scan-results/loaderHelpers';
import { ScanResult } from '@/features/topology/components/scan-results/ScanResult';
import { ApiError, makeRequest } from '@/utils/api';

export type LoaderData = {
  hostData: ModelHost;
  vulnerabilityScanCounts: Awaited<ReturnType<typeof getVulnerabilityScanCounts>>;
  secretScanCounts: Awaited<ReturnType<typeof getSecretScanCounts>>;
  malwareScanCounts: Awaited<ReturnType<typeof getMalwareScanCounts>>;
  complianceScanCounts: Awaited<ReturnType<typeof getComplianceScanCounts>>;
};

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const nodeId = params.nodeId;

  if (!nodeId) {
    throw new Error('nodeId is required');
  }

  const lookupResult = await makeRequest({
    apiFunction: getLookupApiClient().lookupHost,
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
  if (ApiError.isApiError(lookupResult) || !lookupResult.length) {
    throw new Error(`Failed to load host: ${nodeId}`);
  }

  return {
    hostData: lookupResult[0],
    vulnerabilityScanCounts: await getVulnerabilityScanCounts(
      lookupResult[0].vulnerability_latest_scan_id,
    ),
    secretScanCounts: await getSecretScanCounts(lookupResult[0].secret_latest_scan_id),
    malwareScanCounts: await getMalwareScanCounts(lookupResult[0].malware_latest_scan_id),
    complianceScanCounts: await getComplianceScanCounts(
      lookupResult[0].compliance_latest_scan_id,
    ),
  };
};

export const Host = ({
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
    fetcher.load(generatePath('/topology/node-details/host/:nodeId', { nodeId }));
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
      label: 'Connections & Processes',
      value: 'connections-and-processes',
    },
    {
      label: 'Containers & Images',
      value: 'containers-and-images',
    },
  ];

  const header = (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      label={fetcher.data?.hostData?.node_name}
      nodeType="host"
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
                  node_name: toTopologyMetadataString(fetcher.data?.hostData?.node_name),
                  version: toTopologyMetadataString(fetcher.data?.hostData?.version),
                  instance_id: toTopologyMetadataString(
                    fetcher.data?.hostData?.instance_id,
                  ),
                  cloud_provider: toTopologyMetadataString(
                    fetcher.data?.hostData?.cloud_provider,
                  ),
                  cloud_region: toTopologyMetadataString(
                    fetcher.data?.hostData?.cloud_region,
                  ),
                  uptime: toTopologyMetadataString(fetcher.data?.hostData?.uptime),
                  is_console_vm: toTopologyMetadataString(
                    fetcher.data?.hostData?.is_console_vm,
                  ),
                  kernel_version: toTopologyMetadataString(
                    fetcher.data?.hostData?.kernel_version,
                  ),
                  os: toTopologyMetadataString(fetcher.data?.hostData?.os),
                  local_networks: toTopologyMetadataString(
                    fetcher.data?.hostData?.local_networks,
                  ),
                  interface_ips: toTopologyMetadataString(
                    fetcher.data?.hostData?.interface_ips,
                  ),
                  interface_names: toTopologyMetadataString(
                    fetcher.data?.hostData?.interface_names,
                  ),
                  local_cidr: toTopologyMetadataString(
                    fetcher.data?.hostData?.local_cidr,
                  ),
                  instance_type: toTopologyMetadataString(
                    fetcher.data?.hostData?.instance_type,
                  ),
                  public_ip: toTopologyMetadataString(fetcher.data?.hostData?.public_ip),
                  private_ip: toTopologyMetadataString(
                    fetcher.data?.hostData?.private_ip,
                  ),
                  availability_zone: toTopologyMetadataString(
                    fetcher.data?.hostData?.availability_zone,
                  ),
                  resource_group: toTopologyMetadataString(
                    fetcher.data?.hostData?.resource_group,
                  ),
                }}
              />
            )}
            {tab === 'connections-and-processes' && (
              <>
                <ProcessTable
                  processes={fetcher.data?.hostData.processes ?? []}
                  onNodeClick={onNodeClick}
                />
                <ConnectionsTable
                  type="inbound"
                  connections={fetcher.data?.hostData.inbound_connections ?? []}
                />
                <ConnectionsTable
                  type="outbound"
                  connections={fetcher.data?.hostData.outbound_connections ?? []}
                />
              </>
            )}
            {tab === 'containers-and-images' && (
              <>
                <ContainerTable
                  containers={fetcher.data?.hostData.containers ?? []}
                  onNodeClick={onNodeClick}
                />
                <ImageTable
                  images={fetcher.data?.hostData.container_images ?? []}
                  onNodeClick={onNodeClick}
                />
              </>
            )}
            {tab === 'scan-results' && (
              <ScanResult
                vulnerabilityScanStatus={
                  fetcher.data?.hostData?.vulnerability_scan_status
                }
                secretScanStatus={fetcher.data?.hostData?.secret_scan_status}
                malwareScanStatus={fetcher.data?.hostData?.malware_scan_status}
                complianceScanStatus={fetcher.data?.hostData?.compliance_scan_status}
                vulnerabilityScanSummary={fetcher.data?.vulnerabilityScanCounts}
                secretScanSummary={fetcher.data?.secretScanCounts}
                malwareScanSummary={fetcher.data?.malwareScanCounts}
                complianceScanSummary={fetcher.data?.complianceScanCounts}
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
