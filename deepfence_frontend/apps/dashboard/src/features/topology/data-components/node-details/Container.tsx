import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { Button, CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { ModelContainer } from '@/api/generated';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { Header } from '@/features/topology/components/node-details/Header';
import { Metadata } from '@/features/topology/components/node-details/Metadata';
import { ProcessTable } from '@/features/topology/components/node-details/SummaryTables';
import { ApiError, makeRequest } from '@/utils/api';

type LoaderData = {
  containerData: ModelContainer;
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
  };
};

export const Container = ({
  nodeId,
  onGoBack,
  showBackBtn,
}: {
  nodeId: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
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
      label: 'Connections & Processes',
      value: 'containers-and-processes',
    },
    {
      label: 'Containers & Images',
      value: 'containers-and-images',
    },
  ];

  const header = (
    <Header
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
        <div className="flex gap-2">
          <Button
            color="primary"
            size="sm"
            startIcon={
              <div className="h-6 w-6 mr-1">
                <VulnerabilityIcon />
              </div>
            }
          >
            Start Vulnerability Scan
          </Button>
          <Button
            color="primary"
            size="sm"
            startIcon={
              <div className="h-6 w-6 mr-1">
                <SecretsIcon />
              </div>
            }
          >
            Start Secret Scan
          </Button>
          <Button
            color="primary"
            size="sm"
            startIcon={
              <div className="h-6 w-6 mr-1">
                <MalwareIcon />
              </div>
            }
          >
            Start Malware Scan
          </Button>
          <Button
            color="primary"
            size="sm"
            startIcon={
              <div className="h-6 w-6 mr-1">
                <PostureIcon />
              </div>
            }
          >
            Start Compliance Scan
          </Button>
        </div>
        <Tabs
          value={tab}
          defaultValue={tab}
          tabs={tabs}
          onValueChange={(v) => setTab(v)}
          variant="underline"
          className="mt-6"
        >
          <div className="py-4 flex flex-col gap-6">
            {tab === 'metadata' && (
              <Metadata
                data={{
                  // TODO: fix this
                  // kernel_version: (fetcher.data?.hostData as any)?.kernel_version,
                  // interface_ips: (fetcher.data?.hostData as any)?.interface_ips,
                  // interface_names: (fetcher.data?.hostData as any)?.interfaceNames,
                  // uptime: (fetcher.data?.hostData as any)?.uptime,
                  ...fetcher.data?.containerData.metadata,
                }}
              />
            )}
            {tab === 'containers-and-processes' && (
              <ProcessTable processes={fetcher.data?.containerData.processes ?? []} />
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
