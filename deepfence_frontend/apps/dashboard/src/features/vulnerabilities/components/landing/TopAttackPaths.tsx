import '@/features/threat-graph/utils/top-attack-paths-custom-node';

import G6, { IEdge, INode, NodeConfig } from '@antv/g6';
import { useSuspenseQuery } from '@suspensive/react-query';
import { truncate } from 'lodash-es';
import { Suspense, useEffect, useState } from 'react';
import { useMeasure } from 'react-use';
import { cn } from 'tailwind-preset';
import { Card, CircleSpinner } from 'ui-components';

import { GraphIndividualThreatGraph } from '@/api/generated';
import { g6Toolbar } from '@/components/graph/plugin';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ThreatGraphIcon } from '@/components/sideNavigation/icons/ThreatGraph';
import { useG6Graph } from '@/features/threat-graph/hooks/useG6Graph';
import { TopAttackPathsNodeModelConfig } from '@/features/threat-graph/utils/top-attack-paths-custom-node';
import { G6GraphData, G6Node } from '@/features/topology/types/graph';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import { CardHeader } from '@/features/vulnerabilities/components/landing/CardHeader';
import { queries } from '@/queries';
import { Mode, THEME_LIGHT, useTheme } from '@/theme/ThemeContext';

export const TopAttackPaths = ({ nodeIds }: { nodeIds?: string[] }) => {
  const { mode } = useTheme();
  return (
    <Card className="rounded min-h-[380px] h-full flex flex-col">
      <CardHeader
        icon={<ThreatGraphIcon />}
        title={'Top Attack Paths'}
        path={'/threatgraph'}
      />
      <div
        className="flex-1"
        style={{
          mixBlendMode: mode === THEME_LIGHT ? 'multiply' : 'normal',
          background:
            mode === 'dark'
              ? 'linear-gradient(0deg, rgba(22, 37, 59, 0.6), rgba(22, 37, 59, 0.6)), radial-gradient(48.55% 48.55% at 50.04% 51.45%, rgba(27, 47, 77, 0.35) 0%, #020617 100%)'
              : 'radial-gradient(96.81% 77.58% at 50.04% 50%, rgba(247, 247, 247, 0.50) 8.84%, rgba(180, 193, 219, 0.50) 94.89%)',
        }}
      >
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <VulnerabilityThreatGraph nodeIds={nodeIds} />
        </Suspense>
      </div>
    </Card>
  );
};

function isGraphEmpty(data?: GraphIndividualThreatGraph[]): boolean {
  if (!data) return true;
  return !data || !data.length;
}

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

const tooltip = new G6.Tooltip({
  offsetX: 10,
  offsetY: 10,
  itemTypes: ['node'],
  className: 'g6-tooltip-override',
  getContent: (e) => {
    const model = e?.item?.getModel() as TopAttackPathsNodeModelConfig | undefined;
    if (model?.id === 'in-the-internet') {
      return '';
    }
    return `
    <div role="tooltip" class="rounded-[5px] dark:bg-[#C1CFD9] bg-[#f8f8f8] dark:shadow-none shadow-[0_0_6px_2px_rgba(34,34,34,0.20)] py-1.5 px-2.5 text-black flex-col flex gap-2 max-w-[200px]">
      <div>
        <h5 class="text-p3">Name</h5>
        <div class="text-p4">${model?.id}</div>
      </div>

      <div>
        <h5 class="text-p3">Attack Vector</h5>
        <div class="text-p4">${model?.cve_attack_vector}</div>
      </div>

      <div>
        <h5 class="text-p3">Top CVEs</h5>
        <div class="text-p4">${model?.cve_id?.join(', ')}</div>
      </div>

      <div>
        <h5 class="text-p3">Ports</h5>
        <div class="text-p4">${model?.ports?.join(', ')}</div>
      </div>

    </div>
    `;
  },
});

export const VulnerabilityThreatGraph = ({
  nodeIds,
  direction = 'TB',
  hideToolbar,
}: {
  nodeIds?: string[];
  direction?: 'LR' | 'TB';
  hideToolbar?: boolean;
}) => {
  const { mode } = useTheme();
  const [measureRef, { height, width }] = useMeasure<HTMLDivElement>();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { graph } = useG6Graph(container, {
    plugins: [hideToolbar ? undefined : g6Toolbar, tooltip].filter(Boolean),
    layout: {
      type: 'dagre',
      rankdir: direction,
      nodesep: 60,
      ranksep: 40,
      preventOverlap: true,
    },
    modes: {
      default: [
        'drag-canvas',
        {
          type: '',
          maxZoom: 0,
          minZoom: 0,
        },
      ],
    },
  });
  const { data } = useVulnerabilityThreatGraphData(nodeIds);

  useEffect(() => {
    if (!graph || !data || isGraphEmpty(data)) return;
    graph.data(getGraphData(mode, data, direction));
    graph.render();
  }, [graph, data]);

  useEffect(() => {
    if (graph !== null && width && height) {
      graph.changeSize(width, height);
    }
  }, [width, height]);

  useEffect(() => {
    if (!graph) return;
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
    <div
      className={cn('h-full w-full relative select-none', {
        'bg-[#F5F5F5]/50': mode === THEME_LIGHT,
      })}
      ref={measureRef}
    >
      <div className="absolute inset-0" ref={setContainer} />
      {isGraphEmpty(data) ? (
        <div className="absolute inset-0 flex gap-2 items-center justify-center p-6 text-text-text-and-icon">
          <div className="h-6 w-6 shrink-0">
            <ErrorStandardLineIcon />
          </div>
          <div className="text-h3">No attack paths found</div>
        </div>
      ) : null}
    </div>
  );
};

function useVulnerabilityThreatGraphData(nodeIds: string[] = []) {
  return useSuspenseQuery({
    ...queries.threat.individualThreatGraph({
      issueType: 'vulnerability',
      nodeIds,
    }),
  });
}

function getGraphData(
  theme: Mode,
  data: GraphIndividualThreatGraph[],
  direction: 'LR' | 'TB',
) {
  const g6Data: G6GraphData = {
    nodes: [],
    edges: [],
  };
  const nodesMap = new Map<string, TopAttackPathsNodeModelConfig | NodeConfig>();
  const edgesMap = new Map<
    string,
    {
      source: string;
      target: string;
    }
  >();

  nodesMap.set('in-the-internet', {
    id: 'in-the-internet',
    label: 'The Internet',
    icon: {
      show: true,
      img: getNodeImage(theme, 'pseudo')!,
      width: 40,
      height: 40,
    },
    anchorPoints:
      direction === 'LR'
        ? [
            [0, 0.5],
            [1, 0.5],
          ]
        : [
            [0.5, 0], // The center of the left border
            [0.5, 1], // The center of the right border
          ],
    type: 'circle',
  });

  data?.forEach((paths) => {
    if (paths?.attack_path?.length) {
      const _paths = paths.attack_path;
      _paths.forEach((path) => {
        path.forEach((node, index) => {
          if (!nodesMap.has(node)) {
            nodesMap.set(node, {
              type: 'top-attack-paths-graph-node',
              id: node,
              label: truncate(node, { length: 20 }),
              icon: {
                show: true,
                img: getNodeImage(theme, 'host')!,
                width: 30,
                height: 30,
              },
              cve_id: paths.cve_id,
              cve_attack_vector: paths.cve_attack_vector,
              ports: paths.ports,
              direction,
              theme,
            });
          }
          if (index) {
            const prev = path[index - 1];
            if (!edgesMap.has(`${prev}<->${node}`)) {
              edgesMap.set(`${prev}<->${node}`, {
                source: prev,
                target: node,
              });
            }
          }
        });
      });
    }
  });

  g6Data.nodes = Array.from(nodesMap.values());
  g6Data.edges = Array.from(edgesMap.values());

  return g6Data;
}
