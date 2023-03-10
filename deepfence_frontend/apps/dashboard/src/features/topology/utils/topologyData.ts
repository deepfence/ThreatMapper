import {
  ApiDocsGraphResult,
  DetailedConnectionSummary,
  DetailedNodeSummary,
} from '@/api/generated';
import { ApiDiff } from '@/features/topology/types/graph';
import { getObjectKeys } from '@/utils/array';

export function getTopologyDiff(
  data: ApiDocsGraphResult,
  previousData?: ApiDocsGraphResult,
): ApiDiff {
  const nodesDiff: ApiDiff['nodesDiff'] = {
    add: [],
    remove: [],
    update: [],
  };
  const edgesDiff: ApiDiff['edgesDiff'] = {
    add: [],
    remove: [],
    update: [],
  };
  if (!previousData) {
    nodesDiff.add = getObjectKeys(data.nodes).map((key) => {
      return data.nodes[key];
    });
    edgesDiff.add = getObjectKeys(data.edges)
      .map((key) => {
        return data.edges[key];
      })
      .filter((edge) => {
        return edge.source !== edge.target;
      });
    return {
      nodesDiff,
      edgesDiff,
    };
  }
  const nodes = new Map<string, DetailedNodeSummary>();
  const prevNodes = new Map<string, DetailedNodeSummary>();
  const edges = new Map<string, DetailedConnectionSummary>();
  const prevEdges = new Map<string, DetailedConnectionSummary>();
  Object.keys(data.nodes).forEach((id) => {
    const node = data.nodes[id];
    if (node.id && node.id.length) nodes.set(node.id, node);
  });
  Object.keys(previousData.nodes).forEach((id) => {
    const node = previousData.nodes[id];
    if (node.id && node.id.length) prevNodes.set(node.id, node);
  });
  prevNodes.forEach((prevNode, id) => {
    if (nodes.has(id)) {
      nodesDiff.update.push(prevNode);
    } else {
      nodesDiff.remove.push(prevNode);
    }
  });
  nodes.forEach((node, id) => {
    if (!prevNodes.has(id)) {
      nodesDiff.add.push(node);
    }
  });

  Object.keys(data.edges).forEach((id) => {
    const edge = data.edges[id];
    edges.set(id, edge);
  });
  Object.keys(previousData.edges).forEach((id) => {
    const edge = previousData.edges[id];
    prevEdges.set(id, edge);
  });
  prevEdges.forEach((prevEdge, id) => {
    if (edges.has(id)) {
      edgesDiff.update.push(prevEdge);
    } else {
      edgesDiff.remove.push(prevEdge);
    }
  });
  edges.forEach((edge, id) => {
    if (edge.source === edge.target) return;
    if (!prevEdges.has(id)) {
      edgesDiff.add.push(edge);
    }
  });
  return {
    nodesDiff,
    edgesDiff,
  };
}
