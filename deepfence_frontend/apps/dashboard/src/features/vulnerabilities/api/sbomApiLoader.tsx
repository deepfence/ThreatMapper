import classNames from 'classnames';
import { useEffect, useMemo } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import {
  Badge,
  createColumnHelper,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getVulnerabilityApiClient } from '@/api/api';
import { ModelSbomResponse } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { SeverityBadge } from '@/components/SeverityBadge';
import { apiWrapper } from '@/utils/api';

type LoaderData = {
  sbom: ModelSbomResponse[];
  message?: string;
};

export const sbomApiLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<LoaderData> => {
  const scanId = params?.scanId;
  if (!scanId) {
    throw new Error('ScanId is required');
  }
  const sbomDataApi = apiWrapper({
    fn: getVulnerabilityApiClient().getSbom,
  });
  const sbomResponse = await sbomDataApi({
    modelSbomRequest: {
      scan_id: scanId,
    },
  });
  if (!sbomResponse.ok) {
    if (sbomResponse.error.response.status >= 500) {
      return {
        sbom: [],
        message: 'Error getting SBOM data',
      };
    }
    throw sbomResponse.error;
  }

  return {
    sbom: sbomResponse.value,
  };
};

export const SbomModal = ({
  onClose,
  scanId,
  nodeName,
}: {
  scanId: string;
  nodeName: string;
  onClose: () => void;
}) => {
  const fetcher = useFetcher<LoaderData>();
  useEffect(() => {
    fetcher.load(
      generatePath('/data-component/vulnerability/sbom/:scanId', {
        scanId,
      }),
    );
  }, [scanId]);

  const columnHelper = createColumnHelper<LoaderData['sbom'][number]>();
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('package_name', {
        cell: (info) => info.getValue(),
        header: () => 'Package Name',
        minSize: 50,
        size: 70,
        maxSize: 100,
      }),
      columnHelper.accessor('locations', {
        cell: (info) => {
          return info.getValue()?.join(', ');
        },
        header: () => 'Location',
        minSize: 50,
        size: 70,
        maxSize: 100,
      }),
      columnHelper.accessor('cve_id', {
        cell: (info) => {
          return info.getValue() ? (
            <DFLink
              to={generatePath('/vulnerability/unique-vulnerabilities/:cveId', {
                cveId: info.getValue()!,
              })}
              target="_blank"
            >
              {info.getValue()}
            </DFLink>
          ) : null;
        },
        header: () => 'Top CVE',
        minSize: 50,
        size: 70,
        maxSize: 100,
      }),
      columnHelper.accessor('severity', {
        cell: (info) => {
          if (!info.getValue()) return '';
          return <SeverityBadge severity={info.getValue() || ''} />;
        },
        sortingFn: (rowA, rowB) => {
          const severityA = rowA.original.severity?.toLowerCase() || 'default';
          const severityB = rowB.original.severity?.toLowerCase() || 'default';
          const severityMap: { [key: string]: number } = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
            unknown: 0,
            default: 0,
          };
          return severityMap[severityA] - severityMap[severityB];
        },
        header: () => 'Severity',
        minSize: 50,
        size: 70,
        maxSize: 100,
      }),
    ];
    return columns;
  }, []);

  const table =
    fetcher.state === 'loading' ? (
      <TableSkeleton columns={4} rows={20} />
    ) : (
      <Table
        data={fetcher.data?.sbom ?? []}
        columns={columns}
        enableSorting
        enablePagination
        enableColumnResizing
        pageSize={10}
      />
    );

  return (
    <SlidingModal
      open={true}
      onOpenChange={() => {
        onClose();
      }}
      width={'w-2/3'}
    >
      <SlidingModalCloseButton />
      <SlidingModalHeader>SBOM for {nodeName}</SlidingModalHeader>
      <SlidingModalContent>
        {fetcher.data?.message ? fetcher.data?.message : table}
      </SlidingModalContent>
    </SlidingModal>
  );
};
