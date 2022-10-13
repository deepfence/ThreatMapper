import { INode } from '@antv/g6-core';
import { GraphinContext, IG6GraphEvent, Utils } from '@antv/graphin';
import { compact } from 'lodash-es';
import { useContext } from 'react';

import topologyData from '../topology/topology-data-sample.json';
import { useTopologyGraphStyles } from '../topology/useTopologyGraphStyles';
import { Graph } from './Graph';
import { useGraphinOptions } from './useGraphinOptions';

const mockData = Utils.mock(10).circle().graphin();

const Topology = () => {
  const { graph } = useContext(GraphinContext);

  function onNodeMouse(active: boolean) {
    return function onNodeMouseEnter(e: IG6GraphEvent) {
      const { item: node } = e;
      (node as INode)?.getEdges?.()?.forEach?.((edge) => {
        // if not combo set edge to active
        graph.setItemState(edge, 'active', active);
      });
    };
  }

  graph.on('node:mouseenter', onNodeMouse(true));
  graph.on('node:mouseleave', onNodeMouse(false));

  return null;
};

export const Demo = () => {
  const { options } = useGraphinOptions({});
  const { edges, nodes } = useTopologyGraphStyles({
    nodes: topologyData.nodes.add,
    edges: topologyData.edges.add,
  });

  console.log({
    nodes: nodes,
    edges: edges,
  });

  return (
    <Graph
      data={{
        nodes: compact(nodes),
        edges: edges,
      }}
      options={options}
      layout={{ type: 'dagre' }}
      hoverable={{ canHover: true, type: 'node' }}
    >
      <Topology />
    </Graph>
  );
};
