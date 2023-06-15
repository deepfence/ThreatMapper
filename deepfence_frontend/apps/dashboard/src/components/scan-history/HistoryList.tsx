import { cn } from 'tailwind-preset';

import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { HistoryIcon } from '@/components/icons/common/History';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { isScanComplete, isScanFailed } from '@/utils/scan';

export const ScanHistoryList = ({
  scans,
  className,
}: {
  scans: Array<{
    id: string;
    timestamp: string;
    status: string;
    onDeleteClick: (id: string) => void;
    onDownloadClick: (id: string) => void;
    onScanClick: (id: string) => void;
    isCurrent: boolean;
  }>;
  className?: string;
}) => {
  return (
    <div className={cn('flex flex-col gap-1 overflow-y-auto', className)}>
      {scans.map((scan) => {
        return (
          <div className="flex items-center gap-8" key={scan.id}>
            <button
              className="flex items-center gap-2"
              onClick={() => {
                scan.onScanClick(scan.id);
              }}
            >
              <span className="h-3 w-3 shrink-0 dark:text-df-gray-500">
                <HistoryIcon />
              </span>
              <span
                className={cn('text-p7 dark:text-text-text-and-icon', {
                  'dark:text-text-input-value text-t2': scan.isCurrent,
                })}
              >
                {scan.timestamp}
              </span>
            </button>
            <ScanStatusBadge
              status={scan.status}
              className={cn('gap-1 text-p7', {
                'dark:text-text-input-value text-t2': scan.isCurrent,
              })}
            />
            <div className="flex items-center gap-1.5 dark:text-text-link">
              {isScanComplete(scan.status) ? (
                <button
                  className="h-3 w-3 shrink-0"
                  onClick={() => {
                    scan.onDownloadClick(scan.id);
                  }}
                >
                  <DownloadLineIcon />
                </button>
              ) : null}
              {isScanComplete(scan.status) || isScanFailed(scan.status) ? (
                <button
                  className="h-3 w-3 shrink-0"
                  onClick={() => {
                    scan.onDeleteClick(scan.id);
                  }}
                >
                  <TrashLineIcon />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
