import { capitalize, keys } from 'lodash-es';
import { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CircleSpinner } from 'ui-components';

import { ModelScanInfo, ModelScanInfoStatusEnum } from '@/api/generated';
import { TaskIcon } from '@/components/icons/common/Task';
import {
  ScanStatusDeletePending,
  ScanStatusInError,
  ScanStatusInProgress,
  ScanStatusNoData,
  ScanStatusStopped,
  ScanStatusStopping,
} from '@/components/ScanStatusMessage';
import { PostureStatusBadgeIcon } from '@/components/SeverityBadge';
import { FILTER_SEARCHPARAMS } from '@/features/postures/components/scan-result/cloud/Filters';
import {
  useScanStatus,
  useStatusCounts,
} from '@/features/postures/components/scan-result/cloud/hooks';
import { PostureScanResultsPieChart } from '@/features/postures/components/scan-result/PostureScanResultsPieChart';
import { useTheme } from '@/theme/ThemeContext';
import { PostureSeverityType } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';
import {
  isScanComplete,
  isScanDeletePending,
  isScanFailed,
  isScanInProgress,
  isScanStopped,
  isScanStopping,
} from '@/utils/scan';

export const Widgets = () => {
  return (
    <Card className="max-h-[130px] px-4 py-2.5 flex items-center">
      <div className="flex-1 pl-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[120px]">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <SeverityCountWidget />
        </Suspense>
      </div>
    </Card>
  );
};

const SeverityCountWidget = () => {
  const { data: scanStatusResult } = useScanStatus();

  const { data: scanCountResults } = useStatusCounts({
    enabled: scanStatusResult.status === ModelScanInfoStatusEnum.Complete,
  });

  const statusCounts: Record<string, number> = scanCountResults?.statusCounts ?? {};

  const total = scanCountResults?.totalStatus ?? 0;

  const [, setSearchParams] = useSearchParams();

  return (
    <div className="grid grid-cols-12 px-6 items-center">
      <ScanStatusWrapper
        scanStatusResult={scanStatusResult}
        className="col-span-4 flex items-center justify-center min-h-[120px]"
      >
        <div className="col-span-2 h-[120px] w-[120px]">
          <PostureScanResultsPieChart
            data={statusCounts}
            onChartClick={({ name }: { name: string; value: string | number | Date }) => {
              setSearchParams((prev) => {
                prev.delete('page');
                Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                  prev.delete(key);
                });
                prev.append('status', name.toLowerCase());
                return prev;
              });
            }}
          />
        </div>
      </ScanStatusWrapper>
      {isScanComplete(scanStatusResult?.status ?? '') ? (
        <div className="col-span-2 text-text-text-and-icon">
          <span className="text-p1a">Total compliances</span>
          <button
            className="flex flex-1 max-w-[160px] gap-1 items-center dark:text-text-input-value text-text-text-and-icon"
            onClick={() => {
              setSearchParams((prev) => {
                prev.delete('status');
                prev.delete('page');
                return prev;
              });
            }}
          >
            {keys(statusCounts).length > 0 ? (
              <>
                <TaskIcon />
                <span className="text-h1 dark:text-text-input-value text-text-text-and-icon pl-1.5">
                  {abbreviateNumber(total)}
                </span>
              </>
            ) : (
              <ScanStatusNoData />
            )}
          </button>
        </div>
      ) : null}

      <div className="w-px h-[60%] bg-bg-grid-border" />

      <ScanStatusWrapper
        scanStatusResult={scanStatusResult}
        className="col-span-6 flex items-center justify-center min-h-[120px]"
      >
        {keys(statusCounts).length === 0 ? (
          <div className="col-span-6 flex items-center justify-center">
            <ScanStatusNoData />
          </div>
        ) : (
          <StatusesCount statusCounts={statusCounts} />
        )}
      </ScanStatusWrapper>
    </div>
  );
};

const ScanStatusWrapper = ({
  children,
  scanStatusResult,
  displayNoData,
  className,
}: {
  children: React.ReactNode;
  className: string;
  scanStatusResult: ModelScanInfo | undefined;
  displayNoData?: boolean;
}) => {
  if (isScanFailed(scanStatusResult?.status ?? '')) {
    return (
      <div className={className}>
        <ScanStatusInError errorMessage={scanStatusResult?.status_message ?? ''} />
      </div>
    );
  }

  if (isScanStopped(scanStatusResult?.status ?? '')) {
    return (
      <div className={className}>
        <ScanStatusStopped errorMessage={scanStatusResult?.status_message ?? ''} />
      </div>
    );
  }

  if (isScanStopping(scanStatusResult?.status ?? '')) {
    return (
      <div className={className}>
        <ScanStatusStopping />
      </div>
    );
  }

  if (isScanInProgress(scanStatusResult?.status ?? '')) {
    return (
      <div className={className}>
        <ScanStatusInProgress />
      </div>
    );
  }
  if (isScanDeletePending(scanStatusResult?.status ?? '')) {
    return (
      <div className="flex items-center justify-center h-[140px]">
        <ScanStatusDeletePending />
      </div>
    );
  }
  if (displayNoData) {
    return (
      <div className={className}>
        <ScanStatusNoData />
      </div>
    );
  }

  return <>{children}</>;
};

const StatusesCount = ({
  statusCounts,
}: {
  statusCounts: {
    [k: string]: number;
  };
}) => {
  const { mode } = useTheme();
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="col-span-6">
      <div className="flex justify-evenly gap-8">
        {Object.keys(statusCounts)?.map((key: string) => {
          return (
            <div key={key} className="col-span-2 text-text-text-and-icon">
              <span className="text-p1a">{capitalize(key)}</span>
              <button
                className="flex flex-1 max-w-[160px] gap-1 items-center"
                onClick={() => {
                  setSearchParams((prev) => {
                    prev.delete('page');
                    Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                      prev.delete(key);
                    });
                    prev.append('status', key.toLowerCase());
                    return prev;
                  });
                }}
              >
                <PostureStatusBadgeIcon
                  theme={mode}
                  status={key.toLowerCase() as PostureSeverityType}
                  className="h-6 w-6"
                />
                <span className="text-h1 text-text-input-value pl-1.5">
                  {abbreviateNumber(statusCounts?.[key])}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
