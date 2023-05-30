import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { ModelProcess } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import { apiWrapper } from '@/utils/api';

export type LoaderData = {
  processData: ModelProcess;
};

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const nodeId = params.nodeId;

  if (!nodeId) {
    throw new Error('nodeId is required');
  }
  const lookupProcessApi = apiWrapper({
    fn: getLookupApiClient().lookupProcess,
  });
  const lookupResult = await lookupProcessApi({
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
    processData: lookupResult.value[0],
  };
};

export const Process = ({
  nodeId,
  onGoBack,
  showBackBtn,
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
    fetcher.load(generatePath('/topology/node-details/process/:nodeId', { nodeId }));
  }, [nodeId]);

  const tabs = [
    {
      label: 'Metadata',
      value: 'metadata',
    },
  ];

  const header = (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeId}
      label={fetcher.data?.processData?.node_name}
      nodeType="process"
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
                  node_name: toTopologyMetadataString(
                    fetcher.data?.processData?.node_name,
                  ),
                  pid: toTopologyMetadataString(fetcher.data?.processData?.pid),
                  ppid: toTopologyMetadataString(fetcher.data?.processData?.ppid),
                  cmdline: toTopologyMetadataString(fetcher.data?.processData?.cmdline),
                  threads: toTopologyMetadataString(fetcher.data?.processData?.threads),
                }}
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
