import { useCallback, useState } from 'react';
import { cn } from 'tailwind-preset';
import { Dropdown, DropdownItem, IconButton } from 'ui-components';

import { BalanceLineIcon } from '@/components/icons/common/BalanceLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { formatMilliseconds } from '@/utils/date';
import { isScanComplete, isScanFailed } from '@/utils/scan';

export const ScanHistoryDropdown = ({
  scans,
  currentTimeStamp,
}: {
  scans: Array<{
    id: string;
    timestamp: number;
    status: string;
    isCurrent: boolean;
    showScanDiff?: boolean;
    nodeName?: string;
    onDeleteClick: (id: string) => void;
    onDownloadClick: (id: string) => void;
    onScanClick: (id: string) => void;
    onScanTimeCompareButtonClick?: (toScanTime: number, nodeName: string) => void;
  }>;
  currentTimeStamp: string;
}) => {
  const [open, setOpen] = useState(false);

  const areThereMoreThanOneSuccessScan = useCallback(() => {
    const isMoreThanOneScan = scans.length > 1;
    if (!isMoreThanOneScan) {
      return false;
    }
    let scanSuccessCount = 0;
    for (const scan of scans) {
      if (isScanComplete(scan.status)) {
        scanSuccessCount = scanSuccessCount + 1;
      }
      if (scanSuccessCount > 1) {
        return true;
      }
    }
    return false;
  }, [scans]);

  return (
    <Dropdown
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
      content={
        <>
          {scans.map((scan) => {
            return (
              <DropdownItem
                key={scan.timestamp}
                onClick={() => {
                  setOpen(false);
                  scan.onScanClick(scan.id);
                }}
              >
                <div className="flex items-center gap-1.5" key={scan.id}>
                  <ScanStatusBadge
                    status={scan.status}
                    justIcon
                    className={cn('gap-1 text-p7', {
                      'dark:text-text-input-value': scan.isCurrent,
                    })}
                  />
                  <span
                    className={cn('text-p7 dark:text-text-text-and-icon', {
                      'dark:text-text-input-value': scan.isCurrent,
                    })}
                  >
                    {formatMilliseconds(scan.timestamp)}
                  </span>

                  <div className="flex items-center dark:text-text-link">
                    {isScanComplete(scan.status) ? (
                      <IconButton
                        variant="flat"
                        icon={
                          <span className="h-3 w-3">
                            <DownloadLineIcon />
                          </span>
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          scan.onDownloadClick(scan.id);
                          setOpen(false);
                        }}
                      />
                    ) : null}
                    {isScanComplete(scan.status) || isScanFailed(scan.status) ? (
                      <IconButton
                        variant="flat"
                        icon={
                          <span className="h-3 w-3">
                            <TrashLineIcon />
                          </span>
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          scan.onDeleteClick(scan.id);
                          setOpen(false);
                        }}
                      />
                    ) : null}
                    {scan.showScanDiff &&
                    isScanComplete(scan.status) &&
                    areThereMoreThanOneSuccessScan() ? (
                      <IconButton
                        variant="flat"
                        icon={
                          <span className="h-3 w-3">
                            <BalanceLineIcon />
                          </span>
                        }
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          scan?.onScanTimeCompareButtonClick?.(
                            scan.timestamp,
                            scan.nodeName ?? '',
                          );
                          setOpen(false);
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </DropdownItem>
            );
          })}
        </>
      }
    >
      <span className="text-h5 flex items-center dark:text-text-input-value gap-x-2">
        {currentTimeStamp}
        <div className="h-4 w-4 dark:text-accent-accent">
          <CaretDown />
        </div>
      </span>
    </Dropdown>
  );
};
