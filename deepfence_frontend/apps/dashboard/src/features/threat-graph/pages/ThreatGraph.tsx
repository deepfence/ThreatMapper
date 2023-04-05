import '@/features/threat-graph/utils/threat-graph-custom-node';

import { NodeConfig } from '@antv/g6';
import { useEffect, useRef, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { ActionFunctionArgs, useFetcher, useSearchParams } from 'react-router-dom';
import { useMeasure } from 'react-use';
import { IconButton, Popover, Radio } from 'ui-components';

import { getThreatGraphApiClient } from '@/api/api';
import {
  GraphNodeInfo,
  GraphProviderThreatGraph,
  GraphThreatFiltersTypeEnum,
} from '@/api/generated';
import { DetailsModal } from '@/features/threat-graph/data-components/DetailsModal';
import { useG6raph } from '@/features/threat-graph/hooks/useG6Graph';
import { ThreatGraphNodeModelConfig } from '@/features/threat-graph/utils/threat-graph-custom-node';
import { G6GraphData } from '@/features/topology/types/graph';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import { ApiError, makeRequest } from '@/utils/api';

const action = async ({
  request,
}: ActionFunctionArgs): Promise<{ [key: string]: GraphProviderThreatGraph }> => {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const type = searchParams.get('type') as GraphThreatFiltersTypeEnum | undefined;
  const threatGraph = await makeRequest({
    apiFunction: getThreatGraphApiClient().getThreatGraph,
    apiArgs: [
      {
        graphThreatFilters: {
          aws_filter: {
            account_ids: null,
          },
          azure_filter: {
            account_ids: null,
          },
          gcp_filter: { account_ids: null },
          cloud_resource_only: false,
          type: type ?? 'all',
        },
      },
    ],
  });
  if (ApiError.isApiError(threatGraph)) {
    throw new Error('Error getting threatgraph');
  }
  return threatGraph;
};

type ActionData = Awaited<ReturnType<typeof action>>;

function useThreatGraphData() {
  const fetcher = useFetcher<ActionData>();

  const getDataUpdates = (): void => {
    if (fetcher.state !== 'idle') return;
    fetcher.submit({}, { method: 'post' });
  };

  return {
    data: fetcher.data,
    getDataUpdates,
  };
}

const ThreatGraph = () => {
  const [measureRef, { height, width }] = useMeasure<HTMLDivElement>();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [modalData, setModalData] = useState<{
    label: string;
    nodeType: string;
    nodes?: { [key: string]: GraphNodeInfo } | null;
  }>();

  const { graph } = useG6raph(container);
  const { data, ...graphDataFunctions } = useThreatGraphData();
  const graphDataFunctionsRef = useRef(graphDataFunctions);
  graphDataFunctionsRef.current = graphDataFunctions;
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!graph) return;
    graphDataFunctionsRef.current.getDataUpdates();
  }, [searchParams]);

  useEffect(() => {
    if (!graph || !data) return;
    graph.data(getGraphData(data));
    graph.render();
  }, [graph, data]);

  useEffect(() => {
    graphDataFunctionsRef.current.getDataUpdates();
  }, []);

  useEffect(() => {
    if (graph !== null && width && height) {
      graph.changeSize(width, height);
    }
  }, [width, height]);

  useEffect(() => {
    if (!graph) return;
    graph.on('node:click', (e) => {
      const { item } = e;
      const model = item?.getModel?.() as ThreatGraphNodeModelConfig | undefined;
      if (!model) return;
      if (model.nonInteractive) return;
      const { label, nodeType, nodes } = model;
      setModalData({ label, nodeType, nodes });
    });
  }, [graph]);

  return (
    <div className="h-full flex flex-col">
      <ThreatGraphHeader />
      <div className="m-2 flex-1">
        <div className="h-full w-full relative select-none" ref={measureRef}>
          <div className="absolute inset-0" ref={setContainer} />
        </div>
      </div>
      {modalData && (
        <DetailsModal
          open={!!modalData}
          onOpenChange={(open) => {
            if (!open) {
              setModalData(undefined);
            }
          }}
          nodes={modalData.nodes}
          label={modalData.label}
          nodeType={modalData.nodeType}
        />
      )}
    </div>
  );
};

const ThreatGraphHeader = () => {
  const elementToFocusOnClose = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const isFilterApplied = searchParams.get('type') && searchParams.get('type') !== 'all';
  return (
    <div className="flex py-1 px-2 w-full shadow bg-white dark:bg-gray-800 justify-between items-center">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        THREAT GRAPH
      </span>
      <div className="relative gap-x-4">
        {isFilterApplied && (
          <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
        )}
        <Popover
          triggerAsChild
          elementToFocusOnCloseRef={elementToFocusOnClose}
          content={
            <div className="dark:text-white p-4">
              <form className="flex flex-col gap-y-6">
                <fieldset>
                  <legend className="text-sm font-medium">Type</legend>
                  <div className="flex gap-x-4">
                    <Radio
                      direction="row"
                      value={searchParams.get('type') ?? 'all'}
                      onValueChange={(value) => {
                        setSearchParams((prev) => {
                          prev.set('type', value);
                          return prev;
                        });
                      }}
                      options={[
                        {
                          label: 'All',
                          value: 'all',
                        },
                        {
                          label: 'Vulnerability',
                          value: 'vulnerability',
                        },
                        {
                          label: 'Secret',
                          value: 'secret',
                        },
                        {
                          label: 'Malware',
                          value: 'malware',
                        },
                        {
                          label: 'Compliance',
                          value: 'compliance',
                        },
                        {
                          label: 'Cloud Compliance',
                          value: 'cloud_compliance',
                        },
                      ]}
                    />
                  </div>
                </fieldset>
              </form>
            </div>
          }
        >
          <IconButton
            className="ml-auto rounded-lg"
            size="xxs"
            outline
            color="primary"
            ref={elementToFocusOnClose}
            icon={<FiFilter />}
          />
        </Popover>
      </div>
    </div>
  );
};

function getGraphData(data: { [key: string]: GraphProviderThreatGraph }): G6GraphData {
  const g6Data: G6GraphData = {
    nodes: [],
    edges: [],
  };

  if (
    !data['aws'].resources?.length &&
    !data['gcp'].resources?.length &&
    !data['azure'].resources?.length &&
    !data['others'].resources?.length
  ) {
    return g6Data;
  }
  const nodesMap = new Map<string, ThreatGraphNodeModelConfig | NodeConfig>();
  const edgesMap = new Map<
    string,
    {
      source: string;
      target: string;
    }
  >();

  nodesMap.set('The Internet', {
    id: 'The Internet',
    label: 'The Internet',
    size: 30,
    img: getNodeImage('pseudo')!,
    type: 'image',
    nonInteractive: true,
  });

  Object.keys(data).forEach((cloudKey) => {
    const cloudObj = data[cloudKey];
    if (!cloudObj?.resources?.length) {
      return;
    }
    const cloudRootId = `cloud_root_${cloudKey}`;
    nodesMap.set(cloudRootId, {
      id: cloudRootId,
      label: cloudKey === 'others' ? 'private cloud' : cloudKey,
      complianceCount: cloudObj.compliance_count,
      count: 0,
      nodeType: cloudRootId,
      secretsCount: cloudObj.secrets_count,
      vulnerabilityCount: cloudObj.vulnerability_count,
      img: getNodeImage('cloud_provider', cloudKey) ?? getNodeImage('cloud_provider'),
      nonInteractive: true,
    });
    edgesMap.set(`The Internet<->${cloudRootId}`, {
      source: 'The Internet',
      target: cloudRootId,
    });
    cloudObj?.resources?.forEach((singleGraph) => {
      if (singleGraph?.attack_path?.length) {
        const paths = singleGraph.attack_path;
        paths.forEach((path) => {
          path.forEach((node, index) => {
            if (!nodesMap.has(node)) {
              nodesMap.set(node, {
                id: node,
                label: node,
              });
            }
            if (index) {
              let prev = path[index - 1];
              if (prev === 'The Internet') prev = cloudRootId;
              if (!edgesMap.has(`${prev}<->${node}`)) {
                edgesMap.set(`${prev}<->${node}`, {
                  source: prev,
                  target: node,
                });
              }
            }
          });
        });
        if (nodesMap.has(singleGraph.id)) {
          nodesMap.set(singleGraph.id, {
            id: singleGraph.id,
            label: singleGraph.node_type?.replaceAll('_', ' ') ?? singleGraph.label,
            complianceCount: singleGraph.compliance_count,
            count: singleGraph.count,
            nodeType: singleGraph.node_type,
            secretsCount: singleGraph.secrets_count,
            vulnerabilityCount: singleGraph.vulnerability_count,
            img: getNodeImage(singleGraph.node_type) ?? getNodeImage('cloud_provider')!,
            nodes: singleGraph.nodes,
          });
        }
      }
    });
  });

  g6Data.nodes = Array.from(nodesMap.values());
  g6Data.edges = Array.from(edgesMap.values());
  return g6Data;
}

export const module = {
  action,
  element: <ThreatGraph />,
};
