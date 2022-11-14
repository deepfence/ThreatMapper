import { IG6GraphEvent } from '@antv/g6-core';
import { useEffect, useState } from 'react';

import topologyDataAzureCollapse from '../topology//topology-data-v1-azure-collapse.json';
import topologyData from '../topology/topology-data-v1.json';
import topologyDataAzureExpanded from '../topology/topology-data-v1-azure-expanded.json';
import { getParents, uiToServerNodeMap } from '../topology/utils';
import { collapseNode, expandNode } from './graphManager/expand-collapse';
import { useToplogy } from './topology/useToplogy';
import { GraphItem } from './types';
import { useG6raph } from './useG6raph';
import { itemIsExpanded } from './utils';

export const Demo2 = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { graph } = useG6raph(container, {});
  const { update } = useToplogy(graph);

  useEffect(() => {
    if (!graph) {
      return;
    }

    update(topologyData);

    graph.on('node:click', (e: IG6GraphEvent) => {
      const { item: node } = e;
      if (itemIsExpanded(node)) {
        collapseNode(graph, node, (item: GraphItem) => {
          const node = item.get('model');
          let parents = getParents(node.id).map((id) => graph.findById(id).get('model'));
          parents = uiToServerNodeMap(parents);
          // call api
          update(topologyDataAzureCollapse);
        });
      } else {
        expandNode(node);
        // callExpandApi
        update(topologyDataAzureExpanded);
      }
    });
  }, [graph]);

  return <div className="h-screen bg-black" ref={setContainer}></div>;
};
