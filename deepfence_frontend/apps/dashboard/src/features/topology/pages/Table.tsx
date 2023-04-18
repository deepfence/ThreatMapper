import { useSearchParams } from 'react-router-dom';

import { TopologyTable } from '@/features/topology/components/TopologyTable';
import { HostsTable } from '@/features/topology/data-components/tables/HostsTable';
import { KubernetesTable } from '@/features/topology/data-components/tables/KubernetesTable';

const Table = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') ?? 'cloud';
  if (type === 'host') {
    return <HostsTable />;
  } else if (type === 'kubernetes_cluster') {
    return <KubernetesTable />;
  }
  return <TopologyTable key={type} />;
};

export const module = {
  element: <Table />,
};
