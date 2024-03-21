import * as apis from '@/api/generated/apis';

export function isUpgradeAvailable(current: string, versions: string[]) {
  if (!current.length) {
    return false;
  }
  return !!versions.length && versions[0] !== current && versions[0] !== `v${current}`;
}

export const isThreatMapper = !('AlertApi' in apis);
