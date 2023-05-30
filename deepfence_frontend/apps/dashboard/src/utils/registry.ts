import { isNil } from 'lodash-es';

import { ModelRegistryListResp } from '@/api/generated';

export function getRegistryDisplayId(registry: ModelRegistryListResp): string {
  if (registry.name?.length) return registry.name;
  if (!isNil(registry.id)) return `${registry.id}`;
  // we give up
  return '-';
}

export const isNodeTypeARegistryType = (nodeType: string) => {
  return nodeType === 'imageTag' || nodeType == 'image';
};
export const isNodeTypeARegistryTagType = (nodeType: string) => {
  return nodeType === 'imageTag';
};
