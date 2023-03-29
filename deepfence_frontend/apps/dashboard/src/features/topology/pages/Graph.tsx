import { useSearchParams } from 'react-router-dom';

import { Graph as GraphComponent } from '@/features/topology/data-components/Graph';

const Graph = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') ?? 'cloud';
  return <GraphComponent key={type} />;
};

export const module = {
  element: <Graph />,
};
