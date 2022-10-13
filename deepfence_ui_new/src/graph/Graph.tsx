import { GraphOptions } from '@antv/g6-core';
import Graphin, { Behaviors, GraphinData, GraphinTreeData, Layout } from '@antv/graphin';

import { OptionsWithoutContainer } from './useGraphinOptions';

type GraphProps = {
  data: GraphinData | GraphinTreeData;
  options: OptionsWithoutContainer | GraphOptions;
  layout?: Layout;
  children?: React.ReactNode;
  hoverable?: {
    canHover: boolean;
    type: 'node' | 'edge';
  };
};

const { Hoverable, FitView } = Behaviors;

export const Graph = (props: GraphProps) => {
  const { data, options, layout, children, hoverable } = props;
  return (
    <Graphin data={data} options={options} layout={layout} fitView>
      {hoverable?.canHover && <Hoverable bindType={hoverable.type} />}
      {children}
    </Graphin>
  );
};
