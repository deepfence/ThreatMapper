import '@/features/threat-graph/utils/threat-graph-custom-node';

import { NodeConfig } from '@antv/g6';
import { useEffect, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineInformationCircle } from 'react-icons/hi';
import { generatePath, useFetcher } from 'react-router-dom';
import { useMeasure } from 'react-use';
import { CircleSpinner } from 'ui-components';

import { GraphProviderThreatGraph } from '@/api/generated';
import { ThreatGraphLoaderData } from '@/features/threat-graph/data-components/threatGraphLoader';
import { useG6raph } from '@/features/threat-graph/hooks/useG6Graph';
import { ThreatGraphNodeModelConfig } from '@/features/threat-graph/utils/threat-graph-custom-node';
import { G6GraphData } from '@/features/topology/types/graph';
import { getNodeImage } from '@/features/topology/utils/graph-styles';

export type ThreatGraphFilters = {
  type?: string;
  cloud_resource_only?: boolean;
  aws_account_ids?: string[];
  gcp_account_ids?: string[];
  azure_account_ids?: string[];
};

export const ThreatGraphComponent = ({
  onNodeClick,
  filters,
}: {
  onNodeClick?: (model: ThreatGraphNodeModelConfig | undefined) => void;
  filters?: ThreatGraphFilters;
}) => {
  const [measureRef, { height, width }] = useMeasure<HTMLDivElement>();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const { graph } = useG6raph(container);
  const { data, loading, ...graphDataFunctions } = useThreatGraphData();
  const graphDataFunctionsRef = useRef(graphDataFunctions);
  graphDataFunctionsRef.current = graphDataFunctions;

  useEffect(() => {
    graphDataFunctionsRef.current.getDataUpdates({ filters });
  }, [filters]);

  useEffect(() => {
    if (!graph || !data) return;
    graph.data(getGraphData(data));
    graph.render();
  }, [graph, data]);

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
      onNodeClick?.(model);
    });
  }, [graph]);

  return (
    <div className="h-full w-full relative select-none" ref={measureRef}>
      <div className="absolute inset-0" ref={setContainer} />
      {loading ? (
        <div className="absolute bottom-32 left-6 text-gray-600 dark:text-gray-400">
          <CircleSpinner size="xl" />
        </div>
      ) : null}
      {!loading && isGraphEmpty(data) ? (
        <div className="absolute inset-0 flex gap-2 flex-col items-center justify-center p-6">
          <div>
            <IconContext.Provider
              value={{ className: 'text-[3rem] text-blue-600 dark:text-blue-400' }}
            >
              <HiOutlineInformationCircle />
            </IconContext.Provider>
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-lg text-center">
            No attack paths found, please run some scans to discover attack paths.
          </div>
        </div>
      ) : null}
    </div>
  );
};

function isGraphEmpty(data?: ThreatGraphLoaderData): boolean {
  if (!data) return true;
  return (
    !data.aws.resources?.length &&
    !data.gcp.resources?.length &&
    !data.azure.resources?.length &&
    !data.others.resources?.length
  );
}

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

function useThreatGraphData() {
  const fetcher = useFetcher<ThreatGraphLoaderData>();

  const getDataUpdates = ({ filters }: { filters?: ThreatGraphFilters }): void => {
    if (fetcher.state !== 'idle') return;
    const searchParams = new URLSearchParams();
    if (filters?.type) searchParams.set('type', filters.type ?? 'all');
    if (filters?.cloud_resource_only) searchParams.set('cloud_resource_only', 'true');
    if (filters?.aws_account_ids) {
      filters?.aws_account_ids.forEach((id) => {
        searchParams.append('aws_account_ids', id);
      });
    }
    if (filters?.gcp_account_ids) {
      filters?.gcp_account_ids.forEach((id) => {
        searchParams.append('gcp_account_ids', id);
      });
    }
    if (filters?.azure_account_ids) {
      filters?.azure_account_ids.forEach((id) => {
        searchParams.append('azure_account_ids', id);
      });
    }
    fetcher.load(generatePath(`/data-component/threat-graph?${searchParams.toString()}`));
  };

  return {
    data: fetcher.data,
    getDataUpdates,
    loading: fetcher.state !== 'idle',
  };
}
