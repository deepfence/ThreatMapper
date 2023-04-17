import { useSearchParams } from 'react-router-dom';

import { TopologyTable } from '@/features/topology/components/TopologyTable';
import { HostsTable } from '@/features/topology/data-components/tables/HostsTable';

const Table = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') ?? 'cloud';
  if (type === 'host') {
    return <HostsTable />;
  }
  return <TopologyTable key={type} />;
};

export const module = {
  element: <Table />,
};
