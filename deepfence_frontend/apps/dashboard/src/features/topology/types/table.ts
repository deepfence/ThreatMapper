import { DetailedNodeSummary } from '@/api/generated';

export interface TopologyTreeData extends DetailedNodeSummary {
  children?: DetailedNodeSummary[];
}
