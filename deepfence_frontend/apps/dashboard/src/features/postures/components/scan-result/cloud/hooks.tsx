import { useSuspenseQuery } from '@suspensive/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { SortingState } from 'ui-components';

import { ModelCloudNodeComplianceControl } from '@/api/generated';
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

export const useStatusCounts = (options?: { enabled?: boolean }) => {
  const { scanId, nodeType } = usePageParams();
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.posture.postureCloudScanResultStatusCounts({
      scanId,
      nodeType,
      benchmarkTypes: searchParams.getAll('benchmarkType').map((type) => {
        if (type.toLowerCase() === 'soc2') {
          type = 'soc_2';
        }
        return type.toLowerCase();
      }),
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

export const useScanResults = (options?: { enabled?: boolean }) => {
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
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams) || {
        sortBy: 'status',
        descending: true,
      },
      benchmarkTypes: searchParams.getAll('benchmarkType').map((type) => {
        if (type.toLowerCase() === 'soc2') {
          type = 'soc_2';
        }
        return type.toLowerCase();
      }),
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
        descending: options.order?.[0]?.desc ?? true,
      },
      benchmarkTypes: searchParams.getAll('benchmarkType').map((type) => {
        if (type.toLowerCase() === 'soc2') {
          type = 'soc_2';
        }
        return type.toLowerCase();
      }),
      visibility: searchParams.getAll('visibility'),
      status: searchParams.getAll('status'),
      services: searchParams.getAll('services'),
      resources: searchParams.getAll('resources'),
      controls: [options.controlId],
    }),
    keepPreviousData: true,
  });
};

export const useGetControls = ({
  checkType,
  nodeType,
}: {
  checkType: string;
  nodeType: string;
}) => {
  const params = useParams() as {
    scanId: string;
  };
  const [searchParams] = useSearchParams();

  const results: Record<
    string,
    (ModelCloudNodeComplianceControl & {
      counts: Record<string, number>;
      totalCount: number;
    })[]
  > = {};

  const { data: listControlsData } = useSuspenseQuery({
    ...queries.posture.listControls({ checkType, nodeType }),
  });

  const { data: countsByControlsData } = useSuspenseQuery({
    ...queries.posture.scanResultCloudComplianceCountsByControls({
      scanId: params.scanId,
      benchmarkTypes: searchParams.getAll('benchmarkType').map((type) => {
        if (type.toLowerCase() === 'soc2') {
          type = 'soc_2';
        }
        return type.toLowerCase();
      }),
      visibility: searchParams.getAll('visibility'),
      status: searchParams.getAll('status'),
      services: searchParams.getAll('services'),
      resources: searchParams.getAll('resources'),
      controls: searchParams.getAll('controlId'),
    }),
  });

  listControlsData.controls.forEach((control) => {
    if (!results[control.compliance_type ?? '']) {
      results[control.compliance_type ?? ''] = [];
    }
    results[control.compliance_type ?? ''].push({
      ...control,
      counts: countsByControlsData[control.control_id ?? ''] ?? {},
      totalCount: Object.values(
        countsByControlsData[control.control_id ?? ''] ?? {},
      ).reduce((prev, curr) => prev + curr, 0),
    });
  });

  Object.keys(results).forEach((checkType) => {
    results[checkType].sort((a, b) => {
      return b.totalCount - a.totalCount;
    });
  });
  return results;
};
