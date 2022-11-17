import {
  IEdge as EdgeType,
  IG6GraphEvent,
  IGraph as Graph,
  INode as NodeType,
  Item,
} from '@antv/g6';
import { GraphOptions } from '@antv/g6-core';
import { GForceLayoutOptions } from '@antv/layout';

import { IAPIData } from '../topology/utils';

export type IItem = Item;
export type INode = NodeType;
export type IEdge = EdgeType;
export type IEvent = IG6GraphEvent;

export type IGraph = Graph;

export type OptionsWithoutContainer = Omit<GraphOptions, 'container'>;

export interface IStringIndex<TValue> {
  [key: string]: TValue;
}

export type PointTuple = [number, number];

export interface ApiNodeItemType extends IStringIndex<any> {
  id: string;
  label: string;
  label_full: string;
  labelShort: string;
  node_type: string;
  img: 'image' | 'text' | 'font'; // aws
  type: string;
  image: string;
  size: number;
  shape: string;
  labelCfg: object;
  pseudo: boolean;
  nodeType: string;
  reset?: boolean;
}

export type APIDeltaType = {
  add: ApiNodeItemType[];
  update: ApiNodeItemType[];
  remove: string[]; // backend api sends remove as string array
  reset: boolean;
};

export type UpdateDeltaType = {
  root?: {
    delta: APIDeltaType;
  };
  node?: {
    node_id: string;
    delta: IAPIData['nodes'];
  };
  edges?: {
    delta: IAPIData['edges'];
  };
  add?: ApiNodeItemType[];
  remove?: ApiNodeItemType[];
};

type FunctionType = () => void;

export type LayoutOptions = {
  tick: FunctionType;
  onLayoutStart: FunctionType;
  onLayoutEnd: FunctionType;
};

export type InputLayoutOptions = {
  expanding: boolean;
  refreshOnTick: boolean;
};
export type OutputLayoutOptions = {
  options: GForceLayoutOptions;
  nodes: INode[];
  edges: IEdge[];
};
export interface ICustomNode extends INode {
  id: string;
  node_type: string;
  parent_id: string;
  children_ids: Set<string>;
}

export interface ICustomEdge extends IEdge {
  id: string;
  combo_pseudo_inner: boolean;
  combo_pseudo_center: boolean;
}
