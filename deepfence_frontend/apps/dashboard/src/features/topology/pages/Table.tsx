import { useParams } from 'react-router-dom';

import { TopologyCloudTable } from '@/features/topology/components/TopologyCloudTable';
import { CloudResourcesTable } from '@/features/topology/data-components/tables/CloudResourcesTable';
import { ContainersTable } from '@/features/topology/data-components/tables/ContainersTable';
import { HostsTable } from '@/features/topology/data-components/tables/HostsTable';
import { KubernetesTable } from '@/features/topology/data-components/tables/KubernetesTable';
import { PodsTable } from '@/features/topology/data-components/tables/PodsTable';

const Table = () => {
  const params = useParams();
  const type = params.viewType ?? 'cloud_provider';
  if (type === 'host') {
    return <HostsTable />;
  } else if (type === 'kubernetes_cluster') {
    return <KubernetesTable />;
  } else if (type === 'container') {
    return <ContainersTable />;
  } else if (type === 'pod') {
    return <PodsTable />;
  } else if (type === 'cloud_resource') {
    return <CloudResourcesTable />;
  }
  return <TopologyCloudTable key={type} />;
};

export const module = {
  element: <Table />,
};
