import { useParams } from 'react-router-dom';

import { TopologyCloudTable } from '@/features/topology/components/TopologyCloudTable';
import { TopologyGraph } from '@/features/topology/components/TopologyGraph';
import { ContainersTable } from '@/features/topology/data-components/tables/ContainersTable';
import { HostsTable } from '@/features/topology/data-components/tables/HostsTable';
import { KubernetesTable } from '@/features/topology/data-components/tables/KubernetesTable';
import { PodsTable } from '@/features/topology/data-components/tables/PodsTable';

function ViewType() {
  const params = useParams();

  const visualType = params.visual;
  const type = params.viewType ?? 'cloud_provider';

  if (visualType === 'graph') {
    return <TopologyGraph key={type} />;
  } else {
    if (type === 'host') {
      return <HostsTable />;
    } else if (type === 'kubernetes_cluster') {
      return <KubernetesTable />;
    } else if (type === 'container') {
      return <ContainersTable />;
    } else if (type === 'pod') {
      return <PodsTable />;
    }
    return <TopologyCloudTable key={type} />;
  }
}
export const module = {
  element: <ViewType />,
};
