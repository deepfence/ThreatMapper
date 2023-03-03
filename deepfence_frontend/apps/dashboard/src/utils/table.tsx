import { toNumber } from 'lodash-es';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SortingState } from 'ui-components';

export function getPageFromSearchParams(searchParams: URLSearchParams): number {
  const page = toNumber(searchParams.get('page') ?? '0');
  return isFinite(page) && !isNaN(page) && page > 0 ? page : 0;
}

export function getOrderFromSearchParams(
  searchParams: URLSearchParams,
): { sortBy: string; descending: boolean } | undefined {
  const sortBy = searchParams.get('sortby');
  const descending = searchParams.get('desc');
  if (sortBy && descending) {
    return {
      sortBy,
      descending: descending === 'true',
    };
  }
}

export function useSortingState() {
  const [searchParams] = useSearchParams();
  const state = useState<SortingState>(() => {
    const order = getOrderFromSearchParams(searchParams);
    if (!order) return [];
    return [
      {
        id: order.sortBy,
        desc: order.descending,
      },
    ];
  });

  return state;
}
