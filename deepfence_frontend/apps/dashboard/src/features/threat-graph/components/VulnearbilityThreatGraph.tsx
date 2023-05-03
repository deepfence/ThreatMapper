import { generatePath, useFetcher } from 'react-router-dom';

import { GraphVulnerabilityThreatGraphRequestGraphTypeEnum } from '@/api/generated';
import { VulnerabilityThreatGraphLoaderData } from '@/features/threat-graph/data-components/vulnerabilityTthreatGraphLoader';

type VulnerabilityThreatGraphFilters = {
  type: string;
};

function useVulnerabilityThreatGraphData() {
  const fetcher = useFetcher<VulnerabilityThreatGraphLoaderData>();

  const getDataUpdates = ({
    filters,
  }: {
    filters: VulnerabilityThreatGraphFilters;
  }): void => {
    if (fetcher.state !== 'idle') return;

    const searchParams = new URLSearchParams();
    if (filters.type)
      searchParams.set(
        'type',
        filters.type ??
          GraphVulnerabilityThreatGraphRequestGraphTypeEnum.MostVulnerableAttackPaths,
      );

    fetcher.load(
      generatePath(
        `/data-component/threat-graph-vulnerability?${searchParams.toString()}`,
      ),
    );
  };
  return {
    data: fetcher.data,
    getDataUpdates,
    loading: fetcher.state !== 'idle',
  };
}
