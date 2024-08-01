import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { Dispatch, SetStateAction, Suspense, useState } from 'react';
import { cn } from 'tailwind-preset';
import { CircleSpinner, IconButton, Popover } from 'ui-components';

import { BalanceLineIcon } from '@/components/icons/common/BalanceLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
import { isScanComplete, isScanFailed } from '@/utils/scan';

const PopoverPrimitive = Popover.Popover;

interface ScanHistoryDropdownV2Props {
  selectedScan: {
    id: string;
    timestamp: number;
    status: string;
  };
  nodeInfo: {
    nodeId: string;
    nodeType: string;
    scanType: ScanTypeEnum;
  };
  onScanClick: (id: string) => void;
  onScanCompareClick: (scanInfo: { scanId: string; createdAt: number }) => void;
  onScanDeleteClick: (id: string) => void;
  onScanDownloadClick: (id: string) => void;
}

export const ScanHistoryDropdown = (props: ScanHistoryDropdownV2Props) => {
  const [open, setOpen] = useState(false);

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
    >
      <PopoverPrimitive.Trigger className="shrink-0">
        <span className="text-h5 flex items-center text-text-input-value gap-x-2">
          {formatMilliseconds(props.selectedScan.timestamp)}
          <div className="h-4 w-4 text-accent-accent">
            <CaretDown />
          </div>
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="rounded p-3 min-w-[270px] bg-bg-card border dark:border-bg-left-nav border-bg-grid-border shadow-md data-[side=top]:animate-slide-up data-[side=bottom]:animate-slide-down"
          sideOffset={2}
          align="start"
          side="bottom"
        >
          <Suspense
            fallback={
              <div className="min-h-[100px] flex items-center justify-center">
                <CircleSpinner size="md" />
              </div>
            }
          >
            <DropdownContent {...props} setOpen={setOpen} />
          </Suspense>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};

const PAGE_SIZE = 50;

const DropdownContent = (
  props: ScanHistoryDropdownV2Props & { setOpen: Dispatch<SetStateAction<boolean>> },
) => {
  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.common.scanHistories({
        nodeId: props.nodeInfo.nodeId,
        nodeType: props.nodeInfo.nodeType,
        size: PAGE_SIZE,
        scanType: props.nodeInfo.scanType,
      }),
      keepPreviousData: true,
      getNextPageParam: (lastPage, allPages) => {
        if (!('data' in lastPage) || !lastPage.hasNextPage) {
          return undefined;
        }
        return allPages.length * PAGE_SIZE;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * PAGE_SIZE;
      },
    });

  if (data.pages.find((page) => 'error' in page)) {
    return <div className="text-p7a text-status-error">Error getting scan history.</div>;
  }
  const scans = data.pages.flatMap((page) => {
    if ('error' in page) {
      return [];
    }
    return page.data;
  });
  return (
    <div>
      {scans.map((scan) => {
        return (
          <div className="flex gap-1.5 w-full items-center" key={scan.scanId}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onScanClick(scan.scanId);
                props.setOpen(false);
              }}
              className="flex items-center gap-1.5"
            >
              <ScanStatusBadge
                status={scan.status}
                justIcon
                className={cn('gap-1 text-p7', {
                  'text-text-input-value': scan.scanId === props.selectedScan.id,
                })}
              />
              <span
                className={cn('text-p7 text-text-text-and-icon w-max', {
                  'text-text-input-value font-bold dark:font-semibold':
                    scan.scanId === props.selectedScan.id,
                })}
              >
                {formatMilliseconds(scan.createdAt)}
              </span>
            </button>

            <div className="flex ml-auto text-text-link">
              <IconButton
                variant="flat"
                disabled={!isScanComplete(scan.status)}
                icon={
                  <span className="h-3 w-3">
                    <DownloadLineIcon />
                  </span>
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onScanDownloadClick(scan.scanId);
                  props.setOpen(false);
                }}
              />
              <IconButton
                variant="flat"
                disabled={!(isScanComplete(scan.status) || isScanFailed(scan.status))}
                icon={
                  <span className="h-3 w-3">
                    <TrashLineIcon />
                  </span>
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  props.onScanDeleteClick(scan.scanId);
                }}
              />

              <IconButton
                variant="flat"
                disabled={!isScanComplete(scan.status)}
                icon={
                  <span className="h-3 w-3">
                    <BalanceLineIcon />
                  </span>
                }
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onScanCompareClick({
                    scanId: scan.scanId,
                    createdAt: scan.createdAt,
                  });
                }}
              />
            </div>
          </div>
        );
      })}
      {hasNextPage && !isFetchingNextPage ? (
        <button
          type="button"
          className="text-p7a text-text-link flex justify-center w-full mt-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fetchNextPage();
          }}
        >
          Load more
        </button>
      ) : null}
      {isFetchingNextPage ? (
        <div className="flex justify-center w-full mt-2">
          <CircleSpinner size="sm" />
        </div>
      ) : null}
    </div>
  );
};
