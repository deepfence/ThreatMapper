import { cn } from 'tailwind-preset';
import { IconButton } from 'ui-components';

import { ScanTimeList } from '@/components/forms/ScanTimeList';
import { BalanceLineIcon } from '@/components/icons/common/BalanceLine';
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { ScanTypeEnum } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
import { isScanComplete, isScanFailed } from '@/utils/scan';

export const ScanHistoryList = ({
  currentTimeStamp,
  nodeType,
  nodeId,
  currentScanId,
  onDownloadClick,
  onDeleteClick,
  showScanCompareButton,
  onScanClick,
  onScanTimeCompareButtonClick,
  scanType,
}: {
  scanType: ScanTypeEnum;
  currentTimeStamp: number;
  nodeType: string;
  nodeId: string;
  currentScanId: string;
  showScanCompareButton?: boolean;
  onDownloadClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  onScanClick: (id: string) => void;
  onScanTimeCompareButtonClick?: (toScanTime: number) => void;
}) => {
  return (
    <div className="w-[190px]">
      <ScanTimeList
        scanType={scanType}
        triggerVariant="noBackground"
        contentWidth="fit-content"
        defaultSelectedTime={currentTimeStamp}
        valueKey="nodeId"
        onChange={(data) => {
          onScanClick(data.scanId);
        }}
        nodeId={nodeId}
        nodeType={nodeType}
        shouldReverseOption={true}
        renderOption={(scan: {
          updatedAt: number;
          scanId: string;
          status: string;
          nodeName: string;
        }) => {
          return (
            <div className="flex items-center gap-1.5" key={scan.scanId}>
              <ScanStatusBadge
                status={scan.status}
                justIcon
                className={cn('gap-1 text-p7', {
                  'dark:text-text-input-value': scan.scanId === currentScanId,
                })}
              />
              <span
                className={cn('text-p7 dark:text-text-text-and-icon', {
                  'dark:text-text-input-value': scan.scanId === currentScanId,
                })}
              >
                {formatMilliseconds(scan.updatedAt)}
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
                      onDownloadClick(scan.scanId);
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
                      onDeleteClick(scan.scanId);
                    }}
                  />
                ) : null}
                {showScanCompareButton && isScanComplete(scan.status) ? (
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
                      onScanTimeCompareButtonClick?.(scan.updatedAt);
                    }}
                  />
                ) : null}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};
