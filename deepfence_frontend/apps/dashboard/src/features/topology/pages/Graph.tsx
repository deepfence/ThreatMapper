import { useSearchParams } from 'react-router-dom';

import { TopologyGraph } from '@/features/topology/components/TopologyGraph';

const Graph = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') ?? 'cloud';
  return <TopologyGraph key={type} />;
};

export const module = {
  element: <Graph />,
};
