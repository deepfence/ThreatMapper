import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { ModelHost } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import { Metadata } from '@/features/topology/components/node-details/Metadata';
import {
  ContainerTable,
  ImageTable,
  ProcessTable,
} from '@/features/topology/components/node-details/SummaryTables';
import { ApiError, makeRequest } from '@/utils/api';

type LoaderData = {
  hostData: ModelHost;
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

  return {
    hostData: lookupResult[0],
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
          </div>
        </Tabs>
      </SlidingModalContent>
    </>
  );
};

export const module = {
  loader,
};
