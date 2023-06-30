import { mergeQueryKeys } from '@lukemorales/query-key-factory';
import { QueryKey } from '@tanstack/react-query';

import { queryClient } from '@/queries/client';
import { lookupQueries } from '@/queries/lookup';
import { malwareQueries } from '@/queries/malware';
import { postureQueries } from '@/queries/posture';
import { registryQueries } from '@/queries/registry';
import { searchQueries } from '@/queries/search';
import { secretQueries } from '@/queries/secret';
import { topologyQueries } from '@/queries/topology';
import { vulnerabilityQueries } from '@/queries/vulnerability';

export function invalidateQueries(queryKey: QueryKey) {
  return queryClient.invalidateQueries({
    queryKey,
  });
}

export function invalidateAllQueries() {
  queryClient.refetchQueries({
    type: 'active',
  });
}

export const queries = mergeQueryKeys(
  vulnerabilityQueries,
  searchQueries,
  secretQueries,
  malwareQueries,
  registryQueries,
  postureQueries,
  topologyQueries,
  lookupQueries,
);
