import { DetailedConnectionSummary, DetailedNodeSummary } from '@/api/generated';
import {
  ApiDiff,
  EnhancedDetailedConnectionSummary,
  EnhancedDetailedNodeSummary,
  EnhancedDiff,
  G6Graph,
} from '@/features/topology/types/graph';

function enhanceApiNode(apiNode: DetailedNodeSummary): EnhancedDetailedNodeSummary {
  return {
    ...apiNode,
    label_short: apiNode.label ?? '',
  };
}

export function convertApiNodesDiffToModelNodesDiff(
  graph: G6Graph,
  apiNodesDiff: ApiDiff['nodesDiff'],
): Record<string, EnhancedDiff['nodesDiff']> {
  const enhancedDiff: Record<string, EnhancedDiff['nodesDiff']> = {};

  function createEmptyEnhancedNodeDiff(): EnhancedDiff['nodesDiff'] {
    return { add: [], remove: [], update: [] };
  }

  if (apiNodesDiff.add.length) {
    for (const node of apiNodesDiff.add) {
      const enhancedNode = enhanceApiNode(node);
      let parentId = node.immediate_parent_id;
      if (!parentId?.length) {
        parentId = 'root';
      }
      if (!node.pseudo || parentId === 'root') {
        if (!enhancedDiff[parentId])
          enhancedDiff[parentId] = createEmptyEnhancedNodeDiff();
        enhancedDiff[parentId].add.push(enhancedNode);
      }
    }
  }

  if (apiNodesDiff.remove.length) {
    for (const node of apiNodesDiff.remove) {
      const graphNode = graph.findById(node.id ?? '');
      if (!graphNode) {
        console.warn(
          "trying to remove a node that doesn't exist. Was it collapsed?",
          node.id,
        );
        continue;
      }

      const model = graphNode.get('model');
      const parentId = model.immediate_parent_id || 'root';
      if (!enhancedDiff[parentId]) enhancedDiff[parentId] = createEmptyEnhancedNodeDiff();
      enhancedDiff[parentId].remove.push(node.id ?? '');
    }
  }

  // we need to see if we want to ignore the updates for nodes too. in the old version its ignored

  return enhancedDiff;
}

const enhanceApiEdge = (
  apiEdge: DetailedConnectionSummary,
): EnhancedDetailedConnectionSummary => {
  return { ...apiEdge, id: `${apiEdge.source}-${apiEdge.target}` };
};
export function convertApiEdgesDiffToModelEdgesDiff(
  apiEdgesDiff: ApiDiff['edgesDiff'],
): EnhancedDiff['edgesDiff'] {
  const enhancedDiff: EnhancedDiff['edgesDiff'] = {
    add: [],
    remove: [],
    update: [],
  };

  if (apiEdgesDiff.add.length) {
    enhancedDiff.add = apiEdgesDiff.add.map((apiEdge) => {
      return enhanceApiEdge(apiEdge);
    });
  }

  if (apiEdgesDiff.remove.length) {
    enhancedDiff.remove = apiEdgesDiff.remove.map((apiEdge) => {
      return enhanceApiEdge(apiEdge);
    });
  }

  // we dont care about edge updates as it does nothing visually

  return enhancedDiff;
}
