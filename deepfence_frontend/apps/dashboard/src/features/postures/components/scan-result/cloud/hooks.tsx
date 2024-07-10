import { useSuspenseQuery } from '@suspensive/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { SortingState } from 'ui-components';

import { queries } from '@/queries';
import { ComplianceScanNodeTypeEnum } from '@/types/common';
import { getOrderFromSearchParams, getPageFromSearchParams } from '@/utils/table';

export const DEFAULT_PAGE_SIZE = 10;

export const usePageParams = () => {
  return useParams() as {
    nodeType: ComplianceScanNodeTypeEnum;
    scanId: string;
  };
};

export const useScanStatus = () => {
  const { scanId } = usePageParams();
  return useSuspenseQuery({
    ...queries.posture.postureCloudScanStatus({ scanId }),
    keepPreviousData: true,
  });
};

export const useScanResults = (options?: { enabled?: boolean }) => {
  const [searchParams] = useSearchParams();
  const params = usePageParams();
  const scanId = params?.scanId;
  const nodeType = params?.nodeType;

  return useSuspenseQuery({
    ...queries.posture.postureCloudScanResults({
      scanId,
      nodeType,
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams) || {
        sortBy: 'status',
        descending: true,
      },
      benchmarkTypes: searchParams.getAll('benchmarkType'),
      visibility: searchParams.getAll('visibility'),
      status: searchParams.getAll('status'),
      services: searchParams.getAll('services'),
      resources: searchParams.getAll('resources'),
      controls: searchParams.getAll('controlId'),
    }),
    keepPreviousData: true,
    enabled: options?.enabled ?? true,
  });
};

export const useScanResultsByControl = (options: {
  controlId: string;
  page?: number;
  order?: SortingState;
}) => {
  const [searchParams] = useSearchParams();
  const params = useParams() as {
    scanId: string;
    nodeType: string;
  };
  const scanId = params?.scanId;
  const nodeType = params?.nodeType;
  return useSuspenseQuery({
    ...queries.posture.postureCloudScanResults({
      scanId,
      nodeType,
      page: options.page,
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: {
        sortBy: options.order?.[0]?.id ?? 'status',
        descending: options.order?.[0]?.desc ?? false,
      },
      benchmarkTypes: searchParams.getAll('benchmarkType'),
      visibility: searchParams.getAll('visibility'),
      status: searchParams.getAll('status'),
      services: searchParams.getAll('services'),
      resources: searchParams.getAll('resources'),
      controls: [options.controlId],
    }),
    keepPreviousData: true,
  });
};

export const useStatusCounts = (options?: { enabled?: boolean }) => {
  const { scanId, nodeType } = usePageParams();
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.posture.postureCloudScanResultStatusCounts({
      scanId,
      nodeType,
      benchmarkTypes: searchParams.getAll('benchmarkType'),
      visibility: searchParams.getAll('visibility'),
      status: searchParams.getAll('status'),
      services: searchParams.getAll('services'),
      resources: searchParams.getAll('resources'),
      controls: searchParams.getAll('controlId'),
    }),
    keepPreviousData: true,
    enabled: options?.enabled ?? true,
  });
};

export const useGetControls = ({ nodeType }: { nodeType: string }) => {
  const params = useParams() as {
    scanId: string;
  };
  const [searchParams] = useSearchParams();

  const results: Array<{
    controlId: string;
    title: string;
    benchmarkTypes: string[];
    counts: Record<string, number>;
    totalCount: number;
  }> = [];

  const { data: countsByControlsData } = useSuspenseQuery({
    ...queries.posture.scanResultCloudComplianceCountsByControls({
      scanId: params.scanId,
      benchmarkTypes: searchParams.getAll('benchmarkType'),
      visibility: searchParams.getAll('visibility'),
      status: searchParams.getAll('status'),
      services: searchParams.getAll('services'),
      resources: searchParams.getAll('resources'),
      controls: searchParams.getAll('controlId'),
    }),
  });

  Object.keys(countsByControlsData).forEach((controlId) => {
    const totalCount = Object.values(
      countsByControlsData[controlId]?.counts ?? {},
    ).reduce((prev, curr) => prev + curr, 0);
    if (totalCount) {
      results.push({
        controlId,
        benchmarkTypes: countsByControlsData[controlId].benchmark_types ?? [],
        title: countsByControlsData[controlId].title ?? controlId,
        counts: countsByControlsData[controlId].counts ?? {},
        totalCount,
      });
    }
  });

  return results.sort((a, b) => {
    if ((b.counts.alarm ?? 0) - (a.counts.alarm ?? 0)) {
      return (b.counts.alarm ?? 0) - (a.counts.alarm ?? 0);
    }
    if ((b.counts.info ?? 0) - (a.counts.info ?? 0)) {
      return (b.counts.info ?? 0) - (a.counts.info ?? 0);
    }
    if ((b.counts.ok ?? 0) - (a.counts.ok ?? 0)) {
      return (b.counts.ok ?? 0) - (a.counts.ok ?? 0);
    }
    if ((b.counts.skip ?? 0) - (a.counts.skip ?? 0)) {
      return (b.counts.skip ?? 0) - (a.counts.skip ?? 0);
    }
    if ((b.counts.delete ?? 0) - (a.counts.delete ?? 0)) {
      return (b.counts.delete ?? 0) - (a.counts.delete ?? 0);
    }
    return b.totalCount - a.totalCount;
  });
};
