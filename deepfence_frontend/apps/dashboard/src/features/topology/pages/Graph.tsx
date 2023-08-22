import { LoaderFunctionArgs, redirect, useParams } from 'react-router-dom';

import { TopologyGraph } from '@/features/topology/components/TopologyGraph';

const loader = async ({ params }: LoaderFunctionArgs) => {
  const type = params.viewType ?? 'cloud_provider';
  if (type === 'cloud_resource') {
    throw redirect('/topology/table/cloud_resource');
  }
  return null;
};

const Graph = () => {
  const params = useParams();
  const type = params.viewType ?? 'cloud_provider';
  return <TopologyGraph key={type} />;
};

export const module = {
  element: <Graph />,
  loader,
};
