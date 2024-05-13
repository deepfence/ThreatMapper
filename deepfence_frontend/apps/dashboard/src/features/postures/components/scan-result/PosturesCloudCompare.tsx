import { useSuspenseQuery } from '@suspensive/react-query';
import { upperFirst } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import {
  Card,
  CircleSpinner,
  createColumnHelper,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  Table,
  TableNoDataElement,
  TableSkeleton,
  Tabs,
} from 'ui-components';

import { ModelCloudCompliance } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { PostureStatusBadgeIcon } from '@/components/SeverityBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { TruncatedText } from '@/components/TruncatedText';
import { SlidingModalHeaderWrapper } from '@/features/common/SlidingModalHeaderWrapper';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { PostureSeverityType } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
import { abbreviateNumber } from '@/utils/number';

const DEFAULT_PAGE_SIZE = 10;

interface IScanCompareProps {
  baseScanId: string;
  toScanId: string;
  baseScanTime: number;
  toScanTime: number;
}
const useGetScanDiff = (props: { baseScanId: string; toScanId: string }) => {
  const { baseScanId, toScanId } = props;

  return useSuspenseQuery({
    ...queries.posture.scanDiffCloud({
      baseScanId,
      toScanId,
    }),
  });
};

const CompareTable = (props: IScanCompareProps & { type: string }) => {
  const { mode: theme } = useTheme();
  const { data } = useGetScanDiff({
    baseScanId: props.baseScanId,
    toScanId: props.toScanId,
  });

  const tableData = props.type === 'new' ? data.added : data.deleted;

  const [searchParams, setSearchParams] = useSearchParams();

  const columnHelper = createColumnHelper<ModelCloudCompliance>();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('node_id', {
        id: 'control_id',
        enableSorting: true,
        enableResizing: false,
        cell: (info) => {
          return (
            <DFLink
              to={{
                pathname: `./${encodeURIComponent(info.row.original.node_id)}`,
                search: searchParams.toString(),
              }}
              className="flex items-center gap-x-[6px]"
            >
              <div className="w-4 h-4 text-text-text-and-icon">
                <PostureIcon />
              </div>
              <TruncatedText
                text={info.row.original.control_id ?? info.row.original.node_id}
              />
            </DFLink>
          );
        },
        header: () => 'ID',
        minSize: 90,
        size: 100,
        maxSize: 110,
      }),
      columnHelper.accessor('compliance_check_type', {
        cell: (info) => info.getValue().toUpperCase(),
        header: () => <TruncatedText text="Check Type" />,
        minSize: 60,
        size: 80,
        maxSize: 90,
      }),
      columnHelper.accessor('status', {
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2">
              <PostureStatusBadgeIcon
                status={info.getValue() as PostureSeverityType}
                theme={theme}
              />
              {upperFirst(info.getValue())}
            </div>
          );
        },
        header: () => 'Status',
        minSize: 70,
        size: 80,
        maxSize: 90,
      }),
    ];

    return columns;
  }, [setSearchParams]);
  return (
    <div className="mt-4">
      <Table
        size="default"
        data={tableData}
        columns={columns}
        enablePagination
        enableColumnResizing
        enableSorting
        getTrProps={(row) => {
          if (row.original.masked) {
            return {
              className: 'opacity-40',
            };
          }
          return {};
        }}
        enablePageResize
        pageSize={pageSize}
        onPageResize={(newSize) => {
          setPageSize(newSize);
        }}
        noDataElement={<TableNoDataElement text="No data available" />}
      />
    </div>
  );
};

const CompareCountWidget = ({
  title,
  type,
  baseScanId,
  toScanId,
}: {
  title: string;
  type: string;
  baseScanId: string;
  toScanId: string;
}) => {
  const { data } = useGetScanDiff({
    baseScanId,
    toScanId,
  });

  const isDeleted = type === 'deleted';

  const counts = !isDeleted ? data.added : data.deleted;

  return (
    <div className="flex flex-col text-text-text-and-icon items-center">
      <div className="flex flex-col gap-y-1.5">
        <span className="text-p1a">{title}</span>
        <div className="flex flex-1 max-w-[160px] text-text-input-value items-baseline">
          <>
            <div
              className={cn('h-5 w-5', {
                'text-status-success rotate-180': isDeleted,
                'text-status-error': !isDeleted,
              })}
            >
              <ArrowLine />
            </div>

            <span
              className="text-h1 dark:text-text-input pl-1.5"
              data-testid="totalCountId"
            >
              {abbreviateNumber(counts.length)}
            </span>
          </>
        </div>
      </div>
    </div>
  );
};

const CountWidget = (props: {
  title: string;
  type: string;
  baseScanId: string;
  toScanId: string;
}) => {
  return (
    <Card className="mt-4 max-h-[130px] px-4 py-2.5 flex items-center">
      <div className="flex-1 pl-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[120px]">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <CompareCountWidget {...props} />
        </Suspense>
      </div>
    </Card>
  );
};

const ScanComapareTime = ({ baseScanTime, toScanTime }: IScanCompareProps) => {
  return (
    <div className="px-1.5 flex items-center h-12">
      <div className="text-text-text-and-icon text-p4 flex gap-x-1">
        Comparing scan{' '}
        <span className="text-text-input-value text-p4">
          {formatMilliseconds(baseScanTime)}
        </span>{' '}
        with{' '}
        <span className="text-text-input-value text-p4">
          {formatMilliseconds(toScanTime)}
        </span>
      </div>
    </div>
  );
};
const tabs = [
  {
    label: 'New compliances ',
    value: 'new-compliances',
  },
  {
    label: 'Fixed compliances',
    value: 'deleted-compliances',
  },
];
export const PosturesCloudCompare = ({
  open,
  onOpenChange,
  compareInput,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  compareInput: IScanCompareProps;
}) => {
  const [tab, setTab] = useState<'new-compliances' | 'deleted-compliances'>(
    'new-compliances',
  );
  return (
    <>
      <SlidingModal
        open={open}
        onOpenChange={(state) => {
          if (onOpenChange) {
            onOpenChange(state);
          }
        }}
        size="l"
      >
        <SlidingModalCloseButton />
        <SlidingModalHeader>
          <SlidingModalHeaderWrapper>
            <div className="overflow-hidden">
              <TruncatedText text="Scan comparision" />
            </div>
          </SlidingModalHeaderWrapper>
        </SlidingModalHeader>
        <SlidingModalContent>
          <div className="mx-4">
            <ScanComapareTime {...compareInput} />
            <Tabs
              value={tab}
              defaultValue={tab}
              tabs={tabs}
              onValueChange={(v) => {
                setTab(v as any);
              }}
            >
              {tab === 'new-compliances' && (
                <>
                  <CountWidget
                    title="Total new compliances"
                    type="new"
                    baseScanId={compareInput.baseScanId}
                    toScanId={compareInput.toScanId}
                  />
                  <Suspense
                    fallback={<TableSkeleton columns={7} rows={DEFAULT_PAGE_SIZE} />}
                  >
                    <CompareTable {...compareInput} type="new" />
                  </Suspense>
                </>
              )}
              {tab === 'deleted-compliances' && (
                <>
                  <CountWidget
                    title="Total fixed compliances"
                    type="deleted"
                    baseScanId={compareInput.baseScanId}
                    toScanId={compareInput.toScanId}
                  />
                  <Suspense
                    fallback={<TableSkeleton columns={7} rows={DEFAULT_PAGE_SIZE} />}
                  >
                    <CompareTable {...compareInput} type="deleted" />
                  </Suspense>
                </>
              )}
            </Tabs>
          </div>
          <Outlet />
        </SlidingModalContent>
      </SlidingModal>
    </>
  );
};
