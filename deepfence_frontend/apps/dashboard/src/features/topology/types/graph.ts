import { Graph, GraphData, GraphOptions, ICombo, IEdge, INode, Layout } from '@antv/g6';
import { GForceLayoutOptions } from '@antv/layout';

import { DetailedConnectionSummary, DetailedNodeSummary } from '@/api/generated';

export type G6Graph = Graph;
export type G6GraphData = GraphData;
export type G6GraphOptionsWithoutContainer = Omit<GraphOptions, 'container'>;
export type G6Node = INode;
export type G6Edge = IEdge;
export type G6Combo = ICombo;
export type G6Item = G6Node | G6Edge | G6Combo;
export type G6Layout = typeof Layout;

interface ApiNodeDiff {
  add: DetailedNodeSummary[];
  remove: DetailedNodeSummary[];
  update: DetailedNodeSummary[];
}
interface ApiEdgesDiff {
  add: DetailedConnectionSummary[];
  remove: DetailedConnectionSummary[];
  update: DetailedConnectionSummary[];
}
export interface ApiDiff {
  nodesDiff: ApiNodeDiff;
  edgesDiff: ApiEdgesDiff;
}

interface EnhancedNodeDiff {
  add: EnhancedDetailedNodeSummary[];
  remove: string[];
  update: EnhancedDetailedNodeSummary[];
}
interface EnhancedEdgesDiff {
  add: EnhancedDetailedConnectionSummary[];
  remove: EnhancedDetailedConnectionSummary[];
  update: EnhancedDetailedConnectionSummary[];
}
export interface EnhancedDiff {
  nodesDiff: EnhancedNodeDiff;
  edgesDiff: EnhancedEdgesDiff;
}
export interface EnhancedDetailedNodeSummary extends DetailedNodeSummary {
  label_short: string;
}
export interface EnhancedDetailedConnectionSummary extends DetailedConnectionSummary {
  id: string;
}

export type InputLayoutOptions = {
  expanding: boolean;
  refreshOnTick: boolean;
};
export type LayoutOptions = {
  tick: () => void;
  onLayoutStart: () => void;
  onLayoutEnd: () => void;
};

export type OutputLayoutOptions = {
  options: GForceLayoutOptions;
  nodes: INode[];
  edges: IEdge[];
};
