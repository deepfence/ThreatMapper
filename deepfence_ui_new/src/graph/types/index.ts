import { Edge, IGraph as Graph, Node } from '@antv/g6';
import { GraphOptions, IG6GraphEvent } from '@antv/g6-core';
import { GForceLayoutOptions } from '@antv/layout';

import { SourceTargetType } from '../topology/builder';

export type GraphItem = IG6GraphEvent['item'];

export type IGraph = Graph;

export type OptionsWithoutContainer = Omit<GraphOptions, 'container'>;

export interface IStringIndex<TValue> {
  [key: string]: TValue;
}

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
}

export type APIDeltaType = {
  add: ApiNodeItemType[];
  remove: ApiNodeItemType[];
  reset: boolean;
};

export type UpdateDeltaType = {
  root?: {
    delta: APIDeltaType;
  };
  node?: {
    node_id: string;
    delta: APIDeltaType;
  };
  edges?: {
    delta: {
      add: SourceTargetType[];
      remove: SourceTargetType[];
    };
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
  nodes: Node[];
  edges: Edge[];
};
