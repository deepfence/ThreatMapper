import { useEffect, useRef, useState } from 'react';

import topologyDataAzureCollapse from '../topology//topology-data-v1-azure-collapse.json';
import v1 from '../topology/data/v1.json';
import v2 from '../topology/data/v2.json';
import v3 from '../topology/data/v3.json';
import v4 from '../topology/data/v4.json';
import topologyData from '../topology/topology-data-v1.json';
import topologyDataAzureExpanded from '../topology/topology-data-v1-azure-expanded.json';
import { getParents, modelParentsToTopologyParents } from '../topology/utils';
import { collapseNode, expandNode, itemIsExpanded } from './graphManager/expand-collapse';
import { useToplogy } from './topology/useToplogy';
import { ICustomNode, IEvent, IItem } from './types';
import { useG6raph } from './useG6raph';

export const Demo2 = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { graph } = useG6raph(container, {});
  const { update } = useToplogy(graph);

  const countRef = useRef(1);

  countRef.current = 1;

  useEffect(() => {
    if (!graph) {
      return;
    }

    update(topologyData);

    graph.on('node:click', (e: IEvent) => {
      const { item: node } = e;
      countRef.current = countRef.current + 1;

      if (itemIsExpanded(node!)) {
        collapseNode(
          graph,
          node!,
          (_item: IItem) => {
            const node = _item.get('model');

            const item = graph.findById(node.id);

            const parents = getParents(graph, item).map<ICustomNode>((id) =>
              graph.findById(id).get<ICustomNode>('model'),
            );
            const mapParents = modelParentsToTopologyParents(parents);
            console.log('mapParents', mapParents);

            // call api
            update(topologyDataAzureCollapse);
          },
          false,
        );
      } else {
        expandNode(node!);
        // callExpandApi

        let data = {};
        if (countRef.current === 0) {
          data = topologyDataAzureExpanded;
        } else if (countRef.current === 2) {
          data = v2;
        } else if (countRef.current === 3) {
          data = v3;
        } else if (countRef.current === 4) {
          data = v4;
        }
        update(topologyDataAzureExpanded);
      }
    });
  }, [graph]);

  return <div className="h-screen bg-black" ref={setContainer}></div>;
};
