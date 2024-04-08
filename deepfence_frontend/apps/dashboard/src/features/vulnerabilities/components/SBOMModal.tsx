import { useSuspenseQuery } from '@suspensive/react-query';
import { upperFirst } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { generatePath } from 'react-router-dom';
import {
  Button,
  CircleSpinner,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  SortingState,
  Table,
} from 'ui-components';

import {
  ModelSbomResponse,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportOptionsSbomFormatEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { FileLineIcon } from '@/components/icons/common/FileLine';
import { SeverityBadgeIcon } from '@/components/SeverityBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { useDownloadSBOM } from '@/features/common/data-component/downloadSBOMAction';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { VulnerabilitySeverityType } from '@/types/common';

function useScanSBOM(scanId: string) {
  return useSuspenseQuery({
    ...queries.vulnerability.sbomForScan({ scanId }),
  });
}

export const SbomModal = ({
  onClose,
  scanId,
  nodeName,
  nodeType,
}: {
  scanId: string;
  nodeName: string;
  nodeType: string;
  onClose: () => void;
}) => {
  const { downloadSBOM, downloadingInFormat } = useDownloadSBOM();

  return (
    <SlidingModal
      open={true}
      onOpenChange={() => {
        onClose();
      }}
      size="xxl"
    >
      <SlidingModalCloseButton />
      <SlidingModalHeader>
        <div className="flex items-center gap-2 text-text-text-and-icon dark:bg-bg-header bg-bg-breadcrumb-bar p-5 text-h3">
          <div className="h-5 w-5 shrink-0">
            <FileLineIcon />
          </div>
          <TruncatedText text={`SBOM for ${nodeName}`} />
          <Dropdown
            align="end"
            triggerAsChild
            content={
              <>
                <DropdownItem
                  onSelect={(e) => {
                    e.preventDefault();
                    downloadSBOM({
                      scanId,
                      scanType: 'vulnerability',
                      nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
                      format: UtilsReportOptionsSbomFormatEnum.SyftJson1101,
                    });
                  }}
                  disabled={!!downloadingInFormat}
                >
                  <span className="flex text-center gap-x-2">
                    {downloadingInFormat ===
                      UtilsReportOptionsSbomFormatEnum.SyftJson1101 && (
                      <CircleSpinner size="sm" />
                    )}{' '}
                    Syft Format
                  </span>
                </DropdownItem>
                <DropdownItem
                  onSelect={(e) => {
                    e.preventDefault();
                    downloadSBOM({
                      scanId,
                      scanType: 'vulnerability',
                      nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
                      format: UtilsReportOptionsSbomFormatEnum.CyclonedxJson15,
                    });
                  }}
                  disabled={!!downloadingInFormat}
                >
                  <span className="flex text-center gap-x-2">
                    {downloadingInFormat ===
                      UtilsReportOptionsSbomFormatEnum.CyclonedxJson15 && (
                      <CircleSpinner size="sm" />
                    )}{' '}
                    CycloneDX Format
                  </span>
                </DropdownItem>
                <DropdownItem
                  onSelect={(e) => {
                    e.preventDefault();
                    downloadSBOM({
                      scanId,
                      scanType: 'vulnerability',
                      nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
                      format: UtilsReportOptionsSbomFormatEnum.SpdxJson23,
                    });
                  }}
                  disabled={!!downloadingInFormat}
                >
                  <span className="flex text-center gap-x-2">
                    {downloadingInFormat ===
                      UtilsReportOptionsSbomFormatEnum.SpdxJson23 && (
                      <CircleSpinner size="sm" />
                    )}{' '}
                    SPDX Format
                  </span>
                </DropdownItem>
              </>
            }
          >
            <Button
              type="button"
              startIcon={<DownloadLineIcon />}
              endIcon={<CaretDown />}
              className="ml-auto mr-8"
            >
              Download
            </Button>
          </Dropdown>
        </div>
      </SlidingModalHeader>
      <SlidingModalContent>
        <Suspense
          fallback={
            <div className="min-h-[500px] flex items-center justify-center">
              <CircleSpinner size="lg" />
            </div>
          }
        >
          <div className="p-5">
            <ModalContent scanId={scanId} />
          </div>
        </Suspense>
      </SlidingModalContent>
    </SlidingModal>
  );
};

const ModalContent = ({ scanId }: { scanId: string }) => {
  const { mode: theme } = useTheme();
  const { data } = useScanSBOM(scanId);
  const [sort, setSort] = useState<SortingState>([
    {
      id: 'severity',
      desc: true,
    },
  ]);
  const [pageSize, setPageSize] = useState(10);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<ModelSbomResponse>();
    const columns = [
      columnHelper.accessor('package_name', {
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <TruncatedText text="Package name" />,
        minSize: 50,
        size: 70,
        maxSize: 100,
      }),
      columnHelper.accessor('locations', {
        cell: (info) => {
          return <TruncatedText text={info.getValue()?.join(', ') ?? ''} />;
        },
        header: () => <TruncatedText text="Location" />,
        minSize: 70,
        size: 90,
        maxSize: 100,
      }),
      columnHelper.accessor('licenses', {
        cell: (info) => {
          return <TruncatedText text={info.getValue()?.join(', ') ?? ''} />;
        },
        header: () => <TruncatedText text="License" />,
        minSize: 70,
        size: 90,
        maxSize: 100,
      }),
      columnHelper.accessor('cve_id', {
        cell: (info) => {
          const cveNodeId = info.row.original.cve_node_id ?? '';

          if (!info.getValue()?.length) {
            return '-';
          }
          return (
            <DFLink
              to={generatePath('/vulnerability/unique-vulnerabilities/:cveId', {
                cveId: encodeURIComponent(cveNodeId),
              })}
              target="_blank"
            >
              <TruncatedText text={info.getValue() ?? ''} />
            </DFLink>
          );
        },
        header: () => 'Top CVE',
        minSize: 50,
        size: 60,
        maxSize: 100,
      }),
      columnHelper.accessor('severity', {
        sortUndefined: -1,
        cell: (info) => {
          if (!info.getValue()) return '';
          return (
            <div className="flex items-center gap-x-2 tabular-nums">
              <SeverityBadgeIcon
                severity={(info.getValue() as VulnerabilitySeverityType) ?? ''}
                theme={theme}
              />
              {upperFirst(info.getValue())}
            </div>
          );
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
        header: () => <TruncatedText text="Severity" />,
        minSize: 30,
        size: 50,
        maxSize: 100,
      }),
    ];
    return columns;
  }, []);

  if (data.message?.length) {
    return <div className="text-text-text-and-icon">{data.message}</div>;
  }

  return (
    <Table
      data={data.sbom ?? []}
      columns={columns}
      enableSorting
      sortingState={sort}
      onSortingChange={setSort}
      enablePagination
      enableColumnResizing
      pageSize={pageSize}
      enablePageResize
      onPageResize={setPageSize}
    />
  );
};
