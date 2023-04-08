import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { ModelContainer } from '@/api/generated';
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
  ];

  const header = (
    <Header
      onStartScanClick={() => {
        /**TODO */
      }}
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
                    ...fetcher.data?.containerData.docker_labels, // TODO
                  }}
                />
                <Metadata
                  title="Image details"
                  data={{
                    id: fetcher.data?.containerData?.image?.node_id ?? '-',
                    name: fetcher.data?.containerData?.image?.docker_image_name ?? '-',
                    tag: fetcher.data?.containerData?.image?.docker_image_tag ?? '-',
                    size: fetcher.data?.containerData?.image?.docker_image_size ?? '-',
                  }}
                />
                {/* TODO docker labels in case of k8s */}
              </>
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
