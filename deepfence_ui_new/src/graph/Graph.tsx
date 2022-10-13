import Graphin, { Behaviors, GraphinData, GraphinTreeData, Layout } from '@antv/graphin';

import { OptionsWithoutContainer } from './useGraphinOptions';

type GraphProps = {
  data: GraphinData | GraphinTreeData;
  options: OptionsWithoutContainer;
  layout?: Layout;
  children?: React.ReactNode;
  hoverable?: {
    canHover: boolean;
    type: 'node' | 'edge';
  };
};

const { Hoverable } = Behaviors;

export const Graph = (props: GraphProps) => {
  const { data, options, layout, children, hoverable } = props;
  return (
    <Graphin data={data} layout={layout} fitView {...options}>
      {hoverable?.canHover && <Hoverable bindType={hoverable.type} />}
      {children}
    </Graphin>
  );
};
