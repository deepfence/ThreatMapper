import { isNil } from 'lodash-es';

import { ModelRegistryListResp } from '@/api/generated';

export function getRegistryDisplayId(registry: ModelRegistryListResp): string {
  if (
    registry.registry_type === 'docker_hub' &&
    registry?.non_secret?.docker_hub_namespace?.length
  ) {
    return registry?.non_secret?.docker_hub_namespace;
  }

  if (registry.name?.length) return registry.name;
  if (!isNil(registry.id)) return `${registry.id}`;
  // we give up
  return '-';
}
