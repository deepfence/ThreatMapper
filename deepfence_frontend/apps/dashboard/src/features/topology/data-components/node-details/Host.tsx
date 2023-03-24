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
import { ApiDocsBadRequestResponse, ModelHost, ModelScanListResp } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import { Metadata } from '@/features/topology/components/node-details/Metadata';
import {
  ContainerTable,
  ImageTable,
  ProcessTable,
} from '@/features/topology/components/node-details/SummaryTables';
import { ScanResult } from '@/features/topology/components/scan-results/ScanResult';
import { ApiError, makeRequest } from '@/utils/api';

export type LoaderData = {
  hostData: ModelHost;
  scanResults: {
    vulnerabilityResult: ModelScanListResp | null;
    secretResult: ModelScanListResp | null;
    malwareResult: ModelScanListResp | null;
    complianceResult: ModelScanListResp | null;
  };
};

const getScanResults = async (nodeId: string) => {
  const vulnerabilityResultPromise = await makeRequest({
    apiFunction: getVulnerabilityApiClient().listVulnerabilityScans,
    apiArgs: [
      {
        modelScanListReq: {
          node_ids: [
            {
              node_id: nodeId,
              node_type: 'host',
            },
          ],
          window: {
            offset: 0,
            size: 1,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400 || r.status === 404) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });
  const secretResultPromise = await makeRequest({
    apiFunction: getSecretApiClient().listSecretScans,
    apiArgs: [
      {
        modelScanListReq: {
          node_ids: [
            {
              node_id: nodeId,
              node_type: 'host',
            },
          ],
          window: {
            offset: 0,
            size: 1,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400 || r.status === 404) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });
  const malwareResultPromise = await makeRequest({
    apiFunction: getMalwareApiClient().listMalwareScans,
    apiArgs: [
      {
        modelScanListReq: {
          node_ids: [
            {
              node_id: nodeId,
              node_type: 'host',
            },
          ],
          window: {
            offset: 0,
            size: 1,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400 || r.status === 404) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  const complianceResultPromise = await makeRequest({
    apiFunction: getComplianceApiClient().listComplianceScan,
    apiArgs: [
      {
        modelScanListReq: {
          node_ids: [
            {
              node_id: nodeId,
              node_type: 'host',
            },
          ],
          window: {
            offset: 0,
            size: 1,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400 || r.status === 404) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  const [vulnerabilityResult, secretResult, malwareResult, complianceResult] =
    await Promise.all([
      vulnerabilityResultPromise,
      secretResultPromise,
      malwareResultPromise,
      complianceResultPromise,
    ]);

  if (
    ApiError.isApiError(vulnerabilityResult) ||
    ApiError.isApiError(secretResult) ||
    ApiError.isApiError(malwareResult) ||
    ApiError.isApiError(complianceResult)
  ) {
    // TODO: handle error cases
    return {
      vulnerabilityResult: null,
      secretResult: null,
      malwareResult: null,
      complianceResult: null,
    };
  }

  return {
    vulnerabilityResult,
    secretResult,
    malwareResult,
    complianceResult,
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
  if (ApiError.isApiError(lookupResult)) {
    throw new Error(`Failed to load host: ${nodeId}`);
  }

  const scanResults = await getScanResults(nodeId);

  return {
    hostData: lookupResult[0],
    scanResults,
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
              <ScanResult scanResults={fetcher.data?.scanResults} />
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
