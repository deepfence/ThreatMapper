import { mergeQueryKeys } from '@lukemorales/query-key-factory';
import { QueryKey } from '@tanstack/react-query';

import { queryClient } from '@/queries/client';
import { searchQueries } from '@/queries/search';
import { vulnerabilityQueries } from '@/queries/vulnerability';

export function invalidateQueries(queryKey: QueryKey) {
  return queryClient.invalidateQueries({
    queryKey,
  });
}

export const queries = mergeQueryKeys(vulnerabilityQueries, searchQueries);
