import {
  ComboConfig,
  EdgeConfig,
  Graph,
  GraphData,
  GraphOptions,
  ICombo,
  IEdge,
  IG6GraphEvent,
  INode,
  Layout,
  NodeConfig,
} from '@antv/g6';
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
export type G6GraphEvent = IG6GraphEvent;

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
export interface EnhancedDetailedNodeSummary
  extends Pick<DetailedNodeSummary, 'id' | 'label'> {
  df_data: DetailedNodeSummary;
  children_ids?: Set<string>;
  img?: string;
}
export interface EnhancedDetailedConnectionSummary extends DetailedConnectionSummary {
  id: string;
  df_data: DetailedConnectionSummary;
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

export type NodeModel = NodeConfig & Partial<EnhancedDetailedNodeSummary>;
export type EdgeModel = EdgeConfig & Partial<EnhancedDetailedConnectionSummary>;
export type ComboModel = ComboConfig & {
  center_ids?: Array<string>;
};

export type TopologyAction =
  | {
      type: 'expandNode';
      nodeId: string;
      nodeType: string;
    }
  | {
      type: 'collapseNode';
      nodeId: string;
      nodeType: string;
    }
  | {
      type: 'refresh';
    };
