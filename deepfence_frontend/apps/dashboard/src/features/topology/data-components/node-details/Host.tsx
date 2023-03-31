import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import {
  getComplianceApiClient,
  getLookupApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ModelHost } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import { Metadata } from '@/features/topology/components/node-details/Metadata';
import {
  ContainerTable,
  ImageTable,
  ProcessTable,
} from '@/features/topology/components/node-details/SummaryTables';
import { ScanResult } from '@/features/topology/components/scan-results/ScanResult';
import { ScanSummary } from '@/features/topology/types/node-details';
import { ApiError, makeRequest } from '@/utils/api';

export type LoaderData = {
  hostData: ModelHost;
  vulnerabilityScanCounts: Awaited<ReturnType<typeof getVulnerabilityScanCounts>>;
  secretScanCounts: Awaited<ReturnType<typeof getSecretScanCounts>>;
  malwareScanCounts: Awaited<ReturnType<typeof getMalwareScanCounts>>;
  complianceScanCounts: Awaited<ReturnType<typeof getComplianceScanCounts>>;
};

const getVulnerabilityScanCounts = async (
  vulnerabilityScanId?: string,
): Promise<ScanSummary | null> => {
  if (!vulnerabilityScanId || !vulnerabilityScanId.length) {
    return null;
  }
  const vulnerabilityScanResults = await makeRequest({
    apiFunction: getVulnerabilityApiClient().resultVulnerabilityScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          scan_id: vulnerabilityScanId,
          window: {
            offset: 0,
            size: 1,
          },
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: {
              filter_in: {},
            },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(vulnerabilityScanResults)) {
    console.error(vulnerabilityScanResults);
    throw new Error("Couldn't get vulnerability scan results");
  }
  return {
    scanId: vulnerabilityScanId,
    timestamp: vulnerabilityScanResults.created_at,
    counts: vulnerabilityScanResults.severity_counts ?? {},
  };
};

const getSecretScanCounts = async (
  secretScanId?: string,
): Promise<ScanSummary | null> => {
  if (!secretScanId || !secretScanId.length) {
    return null;
  }
  const secretScanResults = await makeRequest({
    apiFunction: getSecretApiClient().resultSecretScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          scan_id: secretScanId,
          window: {
            offset: 0,
            size: 1,
          },
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: {
              filter_in: {},
            },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(secretScanResults)) {
    console.error(secretScanResults);
    throw new Error("Couldn't get secret scan results");
  }
  return {
    scanId: secretScanId,
    timestamp: secretScanResults.created_at,
    counts: secretScanResults.severity_counts ?? {},
  };
};

const getMalwareScanCounts = async (
  malwareScanId?: string,
): Promise<ScanSummary | null> => {
  if (!malwareScanId || !malwareScanId.length) {
    return null;
  }
  const malwareScanResults = await makeRequest({
    apiFunction: getMalwareApiClient().resultMalwareScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          scan_id: malwareScanId,
          window: {
            offset: 0,
            size: 1,
          },
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: {
              filter_in: {},
            },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(malwareScanResults)) {
    console.error(malwareScanResults);
    throw new Error("Couldn't get malware scan results");
  }
  return {
    scanId: malwareScanId,
    timestamp: malwareScanResults.created_at,
    counts: malwareScanResults.severity_counts ?? {},
  };
};

const getComplianceScanCounts = async (
  complianceScanId?: string,
): Promise<ScanSummary | null> => {
  if (!complianceScanId || !complianceScanId.length) {
    return null;
  }
  const complianceScanResults = await makeRequest({
    apiFunction: getComplianceApiClient().resultComplianceScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          scan_id: complianceScanId,
          window: {
            offset: 0,
            size: 1,
          },
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: {
              filter_in: {},
            },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(complianceScanResults)) {
    console.error(complianceScanResults);
    throw new Error("Couldn't get posture scan results");
  }
  return {
    scanId: complianceScanId,
    timestamp: complianceScanResults.created_at,
    counts: complianceScanResults.status_counts ?? {},
  };
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
    secretScanCounts: await getSecretScanCounts(lookupResult[0].secret_latest_scan),
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
                  kernel_version: fetcher.data?.hostData?.kernel_version ?? '-',
                  interface_ips: fetcher.data?.hostData?.interface_ips ?? '-',
                  interface_names: fetcher.data?.hostData?.interfaceNames ?? '-',
                  uptime: fetcher.data?.hostData?.uptime ?? '-',
                  ...fetcher.data?.hostData.cloud_metadata,
                }}
              />
            )}
            {tab === 'connections-and-processes' && (
              <>
                <ProcessTable processes={fetcher.data?.hostData.processes ?? []} />
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
