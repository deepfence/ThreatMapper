import { INode } from '@antv/g6-core';
import { GraphinContext, IG6GraphEvent, Utils } from '@antv/graphin';
import { useContext } from 'react';

import { Graph } from './Graph';
import { useGraphinOptions } from './useGraphinOptions';

const data = Utils.mock(10).circle().graphin();

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

  return (
    <Graph
      data={data}
      options={options}
      layout={{ type: 'dagre' }}
      hoverable={{ canHover: true, type: 'node' }}
    >
      <Topology />
    </Graph>
  );
};
