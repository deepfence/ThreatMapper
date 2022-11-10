/**
 * General Graph utilities
 */

import {
  Graph,
  GraphinData,
  IG6GraphEvent,
  IUserEdge,
  IUserNode,
  Utils,
} from '@antv/graphin';
import { Combo } from '@antv/graphin/lib/typings/type';

type GraphinItemType = IUserNode | IUserEdge | Combo[] | undefined | null;
export type GraphItem = IG6GraphEvent['item'];

// TODO：build-in Graphin.Utils
export const update = (data: GraphinData, type: 'node' | 'edge' = 'node') => {
  const items: GraphinItemType[] = data[`${type}s`];
  return {
    set: (id: string, model: any) => {
      const newItems: GraphinItemType[] = [];
      items.forEach((item: GraphinItemType) => {
        if ((item as IUserNode | IUserEdge)?.id === id) {
          const mergedItem = Utils.deepMix({}, item, model);
          newItems.push(mergedItem);
        } else {
          newItems.push(item);
        }
      });
      return {
        ...data,
        [`${type}s`]: newItems,
      };
    },
  };
};

export function arrayTransformByFunction<T>(
  arrays: T[],
  fn: (element: T) => T | null,
): T[] {
  return arrays.reduce((acc: T[], element: T) => {
    const result = fn(element);
    if (result) {
      acc.push(result);
    }
    return acc;
  }, []);
}

export const basename = (path: string) => {
  const i = path.lastIndexOf('/');
  if (i >= 0) {
    return path.substring(i + 1);
  }
  return path;
};

export const ellipsize = (text: string, n: number) => {
  if (text.length <= n) {
    return text;
  }

  return text.substring(0, n - 3) + '...';
};

export const itemSetExpanded = (item) => {
  const model = item.get('model');
  model.expand_state = ExpandState.EXPANDED;
};

export const itemIsExpanded = (item: GraphItem) => {
  return item?.get?.('model')?.expand_state !== undefined;
};

const itemUnsetExpanded = (item: GraphItem) => {
  const model = item?.get?.('model');
  delete model.expand_state;
};

export const removeNodeItem = (graph: Graph, item: GraphItem) => {
  if (!item) {
    return;
  }
  for (const edge of item.getEdges()) {
    const edge_model = edge.get('model');
    if (edge_model.connection) {
      graph.removeItem(edge_model.id);
    }
  }

  const model = item?.get?.('model');
  console.log('removing node', model.id);
  graph.removeItem(item);
};

export const collapseSimpleNode = (
  graph: Graph,
  item: GraphItem,
  onNodeCollapsed: any,
  isChild: boolean,
) => {
  const model = item?.get?.('model');
  const node_id = model.id;

  const edges = item?.getOutEdges?.() ?? [];
  for (const edge of edges) {
    graph.removeItem(edge.id);
  }

  if (model.children_ids) {
    for (const child_id of model.children_ids) {
      const child = graph.findById(child_id);

      if (itemIsExpanded(child)) {
        collapseSimpleNode(graph, child, onNodeCollapsed, true);
      }
      removeNodeItem(graph, child);
    }

    model.children_ids.clear();
  }

  itemUnsetExpanded(item);

  if (onNodeCollapsed) {
    onNodeCollapsed(item, isChild);
  }
};
