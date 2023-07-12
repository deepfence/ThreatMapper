import { DetailedConnectionSummary, DetailedNodeSummary } from '@/api/generated';
import {
  ApiDiff,
  EnhancedDetailedConnectionSummary,
  EnhancedDetailedNodeSummary,
  EnhancedDiff,
  G6Graph,
  NodeModel,
} from '@/features/topology/types/graph';
import { getShortLabel } from '@/features/topology/utils/graph-styles';

function enhanceApiNode(apiNode: DetailedNodeSummary): EnhancedDetailedNodeSummary {
  return {
    id: apiNode.id!,
    label: getShortLabel(apiNode.label, apiNode.type),
    df_data: apiNode,
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
      if (node.type !== 'pseudo' || parentId === 'root') {
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

      const model = graphNode.get('model') as NodeModel;
      const parentId = model.df_data?.immediate_parent_id?.length
        ? model.df_data.immediate_parent_id
        : 'root';
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
  return { ...apiEdge, id: `${apiEdge.source}-${apiEdge.target}`, df_data: apiEdge };
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
