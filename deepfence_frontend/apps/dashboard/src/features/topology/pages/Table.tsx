import { useSearchParams } from 'react-router-dom';

import { TopologyTable } from '@/features/topology/components/TopologyTable';

const Table = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') ?? 'cloud';
  return <TopologyTable key={type} />;
};

export const module = {
  element: <Table />,
};
