import { INode } from '@antv/g6-core';
import {
  Behaviors,
  GraphinContext,
  GraphinContextType,
  IG6GraphEvent,
  Utils,
} from '@antv/graphin';
import { compact } from 'lodash-es';
import { useContext, useMemo } from 'react';

import { TopologyNodeType } from '../topology/topology-client';
// import topologyData from '../topology/topology-data-sample.json';
import topologyData from '../topology/topology-data-v1.json';
import topologyDataAzureExpanded from '../topology/topology-data-v1-azure-expanded.json';
import { useTopologyGraphStyles } from '../topology/useTopologyGraphStyles';
import {
  getParents,
  modelNodeTypeToTopologyChildrenTypes,
  uiToServerNodeMap,
  uiToServerNodeParents,
  updateEdges,
  updateNode,
} from '../topology/utils';
import { Graph } from './Graph';
import { useGraphinOptions } from './useGraphinOptions';
import { collapseSimpleNode, GraphItem, itemIsExpanded } from './utils';

const mockData = Utils.mock(10).circle().graphin();

const Topology = () => {
  const { graph } = useContext<GraphinContextType>(GraphinContext);

  function onNodeMouse(active: boolean) {
    return function onNodeMouseEnter(e: IG6GraphEvent) {
      const { item: node } = e;
      (node as INode)?.getEdges?.()?.forEach?.((edge) => {
        // if not combo set edge to active
        graph.setItemState(edge, 'active', active);
      });
    };
  }

  function onNodeCollapsed(item: IG6GraphEvent['item'], isChild: boolean) {
    console.log('onNodeCollapsed:', item);
  }

  function onNodeExpand(item: GraphItem) {
    if (item == null) {
      return;
    }
    const node = item.get?.('model');

    const topo_node_type = uiToServerNodeMap(node.node_type);
    if (!topo_node_type) {
      console.error("node can't be expanded", node);
      return;
    }
    let parents = getParents(graph, item).map((id: string) =>
      graph.findById(id).get('model'),
    );

    parents = uiToServerNodeParents(parents);

    const kubernetes = parents[TopologyNodeType.KUBERNETES_CLUSTER] !== undefined;

    const topo_children_types = modelNodeTypeToTopologyChildrenTypes(node.node_type, {
      kubernetes,
    });
    if (topo_children_types === undefined) {
      console.log('node can not be expanded', node);
      return;
    }
    if (topologyDataAzureExpanded.edges.remove) {
      updateEdges(graph, {
        remove: topologyDataAzureExpanded.edges.remove,
        // reset: data.reset,
      });
    }

    if (topologyDataAzureExpanded.nodes.add) {
      updateNode(graph, item, topologyDataAzureExpanded.nodes.add);
    }

    // expandNode api call

    if (topologyDataAzureExpanded.edges.add) {
      updateEdges(graph, {
        add: topologyDataAzureExpanded.edges.add,
      });
    }
  }

  graph.on('node:mouseenter', onNodeMouse(true));
  graph.on('node:mouseleave', onNodeMouse(false));
  graph.on('node:click', (e: IG6GraphEvent) => {
    const { item: node } = e;
    if (itemIsExpanded(node)) {
      // collapseNode(graph, node, onNodeCollapsed);
      collapseSimpleNode(graph, node, onNodeCollapsed, false);
    } else {
      // expandNode(graph, item);
      onNodeExpand(node);
    }
  });

  return null;
};

export const Demo = () => {
  const { options } = useGraphinOptions({});
  const { edges, nodes } = useMemo(() => {
    return useTopologyGraphStyles({
      nodes: topologyData.nodes.add,
      edges: topologyData.edges.add,
    });
  }, []);

  return (
    <Graph
      data={{
        nodes: compact(nodes),
        edges: edges,
      }}
      options={{ ...options }}
      layout={{ type: 'dagre' }}
      hoverable={{ canHover: true, type: 'node' }}
    >
      <Topology />
    </Graph>
  );
};
