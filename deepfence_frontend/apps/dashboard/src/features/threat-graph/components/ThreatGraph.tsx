import '@/features/threat-graph/utils/threat-graph-custom-node';

import { IEdge, INode } from '@antv/g6';
import { useSuspenseQuery } from '@suspensive/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMeasure } from 'react-use';

import { GraphProviderThreatGraph, GraphThreatFiltersTypeEnum } from '@/api/generated';
import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';
import { useG6Graph } from '@/features/threat-graph/hooks/useG6Graph';
import { ThreatGraphNodeModelConfig } from '@/features/threat-graph/utils/threat-graph-custom-node';
import {
  G6GraphData,
  G6GraphOptionsWithoutContainer,
  G6Node,
} from '@/features/topology/types/graph';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import { queries } from '@/queries';
import { Mode, THEME_LIGHT, useTheme } from '@/theme/ThemeContext';

const setActiveState = (item: INode | IEdge, active: boolean) => {
  if (active) {
    item.toFront();
    item.setState('active', true);
  } else {
    item.toFront();
    item.clearStates('active');
  }
};

function highlihgtChildrenNodes(node: G6Node, value: boolean) {
  setActiveState(node, value);
  node.getOutEdges().forEach((edge) => {
    setActiveState(edge, value);
    const target = edge.getTarget();
    highlihgtChildrenNodes(target, value);
  });
}

function highlihgtParentNodes(node: G6Node, value: boolean) {
  setActiveState(node, value);
  node.getInEdges().forEach((edge) => {
    setActiveState(edge, value);
    const source = edge.getSource();
    highlihgtParentNodes(source, value);
  });
}

export const ThreatGraphComponent = ({
  onNodeClick,
  options,
}: {
  onNodeClick?: (model: ThreatGraphNodeModelConfig | undefined) => void;
  options?: G6GraphOptionsWithoutContainer;
}) => {
  const { mode } = useTheme();
  const [measureRef, { height, width }] = useMeasure<HTMLDivElement>();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const { graph } = useG6Graph(container, options);
  const { data } = useThreatGraphData();

  useEffect(() => {
    if (!graph || !data || isGraphEmpty(data)) return;
    graph.data(getGraphData(mode, data));
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
    graph.on('node:mouseenter', (e) => {
      const item = e.item as G6Node;
      if (item.getOutEdges().length) {
        highlihgtChildrenNodes(item, true);
      } else {
        highlihgtParentNodes(item, true);
      }
    });
    graph.on('node:mouseleave', (e) => {
      const item = e.item as G6Node;
      if (item.getOutEdges().length) {
        highlihgtChildrenNodes(item, false);
      } else {
        highlihgtParentNodes(item, false);
      }
    });
  }, [graph]);

  return (
    <div className="h-full w-full relative select-none" ref={measureRef}>
      <div className="absolute inset-0" ref={setContainer} />
      {isGraphEmpty(data) ? (
        <div
          className="absolute inset-0 flex gap-2 flex-col items-center justify-center p-6"
          style={{
            mixBlendMode: mode === THEME_LIGHT ? 'multiply' : 'normal',
            background:
              mode === 'dark'
                ? 'linear-gradient(0deg, rgba(22, 37, 59, 0.60) 0%, rgba(22, 37, 59, 0.60) 100%), radial-gradient(48.55% 48.55% at 50.04% 51.45%, rgba(27, 47, 77, 0.35) 0%, #020617 100%)'
                : 'radial-gradient(96.81% 77.58% at 50.04% 50%, rgba(247, 247, 247, 0.50) 8.84%, rgba(180, 193, 219, 0.50) 94.89%)',
          }}
        >
          <div className="w-8 h-8 text-status-info">
            <ErrorStandardSolidIcon />
          </div>
          <div className="text-text-text-and-icon text-lg text-center">
            No attack paths found, please run some scans to discover attack paths.
          </div>
        </div>
      ) : null}
    </div>
  );
};

function isGraphEmpty(data?: { [key: string]: GraphProviderThreatGraph }): boolean {
  if (!data) return true;
  return (
    !data.aws.resources?.length &&
    !data.gcp.resources?.length &&
    !data.azure.resources?.length &&
    !data.others.resources?.length
  );
}

function getGraphData(
  theme: Mode,
  data: { [key: string]: GraphProviderThreatGraph },
): G6GraphData {
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
  const nodesMap = new Map<string, ThreatGraphNodeModelConfig>();
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
    nodeType: 'pseudo',
    count: 0,
    issuesCount: 0,
    cloudId: 'NA',
    icon: {
      show: true,
      img: getNodeImage(theme, 'pseudo')!,
      width: 40,
      height: 40,
    },
    nonInteractive: true,
    theme,
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
      cloudId: cloudKey,
      issuesCount:
        cloudObj.cloud_compliance_count +
        cloudObj.compliance_count +
        cloudObj.secrets_count +
        cloudObj.vulnerability_count,
      count: 0,
      nodeType: cloudRootId,
      icon: {
        show: true,
        img:
          getNodeImage(theme, 'cloud_provider', cloudKey) ??
          getNodeImage(theme, 'cloud_provider'),
        width: 30,
        height: 30,
      },
      nonInteractive: true,
      theme,
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
                cloudId: cloudKey,
                theme,
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
            label: `${singleGraph.node_type?.replaceAll('_', ' ') ?? singleGraph.label}${
              singleGraph.count ? ` (${singleGraph.count})` : ''
            }`,
            issuesCount:
              singleGraph.warn_alarm_count +
              singleGraph.exploitable_secrets_count +
              singleGraph.exploitable_vulnerabilities_count +
              singleGraph.cloud_warn_alarm_count,
            nodeType: singleGraph.node_type,
            icon: {
              show: true,
              img:
                getNodeImage(theme, singleGraph.node_type) ??
                getNodeImage(theme, 'cloud_provider')!,
              width: 30,
              height: 30,
              ...{ cursor: 'pointer' },
            },
            nodes: singleGraph.nodes,
            cloudId: cloudKey,
            style: {
              cursor: 'pointer',
            },
            theme,
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
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.threat.threatGraph({
      awsAccountIds: searchParams.getAll('aws_account_ids'),
      gcpAccountIds: searchParams.getAll('gcp_account_ids'),
      azureAccountIds: searchParams.getAll('azure_account_ids'),
      cloudResourceOnly: searchParams.get('cloud_resource_only') === 'true',
      type: (searchParams.get('type') as GraphThreatFiltersTypeEnum | undefined) ?? 'all',
    }),
  });
}
