import { useEffect, useState } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { CircleSpinner, SlidingModalContent, Tabs } from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { ModelPod } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Header } from '@/features/topology/components/node-details/Header';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import { ContainerTable } from '@/features/topology/components/node-details/SummaryTables';
import { apiWrapper } from '@/utils/api';

export type LoaderData = {
  podData: ModelPod;
};

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const nodeId = params.nodeId;

  if (!nodeId) {
    throw new Error('nodeId is required');
  }
  const lookupPodApi = apiWrapper({
    fn: getLookupApiClient().lookupPod,
  });
  const lookupResult = await lookupPodApi({
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
    podData: lookupResult.value[0],
  };
};

export const Pod = ({
  nodeId,
  onGoBack,
  showBackBtn,
  onStartScanClick,
  onNodeClick,
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
    fetcher.load(generatePath('/topology/node-details/pod/:nodeId', { nodeId }));
  }, [nodeId]);

  const tabs = [
    {
      label: 'Metadata',
      value: 'metadata',
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
      label={fetcher.data?.podData?.node_name}
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
                  node_name: toTopologyMetadataString(fetcher.data?.podData?.node_name),
                  kubernetes_namespace: toTopologyMetadataString(
                    fetcher.data?.podData?.kubernetes_namespace,
                  ),
                  host_name: toTopologyMetadataString(fetcher.data?.podData?.host_name),
                  kubernetes_cluster_name: toTopologyMetadataString(
                    fetcher.data?.podData?.kubernetes_cluster_name,
                  ),
                  kubernetes_cluster_id: toTopologyMetadataString(
                    fetcher.data?.podData?.kubernetes_cluster_id,
                  ),
                  kubernetes_state: toTopologyMetadataString(
                    fetcher.data?.podData?.kubernetes_state,
                  ),
                  kubernetes_ip: toTopologyMetadataString(
                    fetcher.data?.podData?.kubernetes_ip,
                  ),
                  kubernetes_is_in_host_network: toTopologyMetadataString(
                    fetcher.data?.podData?.kubernetes_is_in_host_network,
                  ),
                }}
              />
            )}
            {tab === 'containers' && (
              <>
                <ContainerTable
                  containers={fetcher.data?.podData?.containers ?? []}
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
