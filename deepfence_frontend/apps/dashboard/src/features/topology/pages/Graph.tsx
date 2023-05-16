import { useParams } from 'react-router-dom';

import { TopologyGraph } from '@/features/topology/components/TopologyGraph';

const Graph = () => {
  const params = useParams();
  const type = params.viewType ?? 'cloud_provider';
  return <TopologyGraph key={type} />;
};

export const module = {
  element: <Graph />,
};
