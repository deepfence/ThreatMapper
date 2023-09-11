import { useSuspenseQuery } from '@suspensive/react-query';
import { isNil } from 'lodash-es';
import { Suspense } from 'react';
import { generatePath } from 'react-router-dom';
import { Card, CircleSpinner } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';
import { POSTURE_STATUS_COLORS, SEVERITY_COLORS } from '@/constants/charts';
import { ScanResultChart } from '@/features/topology/components/scan-results/ScanResultChart';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { ScanTypeEnum } from '@/types/common';
import { sortBySeverity } from '@/utils/array';
import { formatToRelativeTimeFromNow } from '@/utils/date';
import { abbreviateNumber } from '@/utils/number';
import {
  isNeverScanned,
  isScanComplete,
  isScanFailed,
  isScanInProgress,
} from '@/utils/scan';

function useScanResultSummaryCounts(scanId = '', type: ScanTypeEnum) {
  return {
    [ScanTypeEnum.VulnerabilityScan]: useSuspenseQuery({
      ...queries.vulnerability.scanResultSummaryCounts({ scanId }),
      enabled: type === ScanTypeEnum.VulnerabilityScan && !!scanId.length,
    }),
    [ScanTypeEnum.SecretScan]: useSuspenseQuery({
      ...queries.secret.scanResultSummaryCounts({ scanId }),
      enabled: type === ScanTypeEnum.SecretScan && !!scanId.length,
    }),
    [ScanTypeEnum.MalwareScan]: useSuspenseQuery({
      ...queries.malware.scanResultSummaryCounts({ scanId }),
      enabled: type === ScanTypeEnum.MalwareScan && !!scanId.length,
    }),
    [ScanTypeEnum.ComplianceScan]: useSuspenseQuery({
      ...queries.posture.scanResultSummaryCountsCompliance({ scanId }),
      enabled: type === ScanTypeEnum.ComplianceScan && !!scanId.length,
    }),
    // this following is dummy, to stop typescript from complaining
    [ScanTypeEnum.CloudComplianceScan]: useSuspenseQuery({
      ...queries.posture.scanResultSummaryCountsCompliance({ scanId }),
      enabled: type === ScanTypeEnum.CloudComplianceScan && !!scanId.length,
    }),
  }[type];
}

const getSeriesOption = (counts: {
  [x: string]: number;
}): Array<{
  name: string;
  value: number;
  color: string;
}> => {
  return sortBySeverity(
    Object.keys(counts).map((key) => {
      return {
        name: key,
        value: counts[key],
        color:
          SEVERITY_COLORS[key as keyof typeof SEVERITY_COLORS] ??
          POSTURE_STATUS_COLORS[key as keyof typeof POSTURE_STATUS_COLORS] ??
          '',
      };
    }),
    'name',
  ).reverse();
};

const ScanResultHeading = ({
  timestamp,
  type,
  scanId,
}: {
  timestamp?: number;
  type: ScanTypeEnum;
  scanId?: string;
}) => {
  let title = '';
  let scanResultPath = '';
  if (type === ScanTypeEnum.VulnerabilityScan) {
    title = 'Vulnerability Scan';
    scanResultPath = '/vulnerability/scan-results';
  } else if (type === ScanTypeEnum.SecretScan) {
    title = 'Secret Scan';
    scanResultPath = '/secret/scan-results';
  } else if (type === ScanTypeEnum.MalwareScan) {
    title = 'Malware Scan';
    scanResultPath = '/malware/scan-results';
  } else if (type === ScanTypeEnum.ComplianceScan) {
    title = 'Posture Scan';
  }
  return (
    <div className="flex items-center px-3 py-2.5 justify-between">
      {scanId ? (
        <DFLink
          to={
            type === ScanTypeEnum.ComplianceScan
              ? generatePath('/posture/scan-results/:nodeType/:scanId', {
                  scanId: encodeURIComponent(scanId),
                  nodeType: 'linux',
                })
              : generatePath(`${scanResultPath}/:scanId`, {
                  scanId: encodeURIComponent(scanId),
                })
          }
          className="text-h5"
          target="_blank"
        >
          {title}
        </DFLink>
      ) : (
        <h5 className="text-h5 dark:text-text-input-value">{title}</h5>
      )}
      {timestamp ? (
        <div className="dark:text-text-text-and-icon text-p8">
          {formatToRelativeTimeFromNow(timestamp)}
        </div>
      ) : null}
    </div>
  );
};

const ScanStatusError = () => {
  return (
    <div className="flex items-center justify-center h-full w-full gap-2">
      <div className="h-6 w-6 shrink-0 dark:text-status-error">
        <ErrorStandardSolidIcon />
      </div>
      <p className="dark:text-text-text-and-icon text-h3">Scan failed</p>
    </div>
  );
};

const ScanStatusInProgress = () => {
  return (
    <div className="flex items-center justify-center h-full w-full gap-2">
      <CircleSpinner size="sm" />
      <p className="dark:text-text-text-and-icon text-h3">Scan in progress</p>
    </div>
  );
};

const ScanStatusNeverScanned = () => {
  return (
    <div className="flex items-center justify-center h-full w-full gap-2">
      <div className="h-6 w-6 shrink-0 dark:text-text-text-and-icon">
        <ErrorStandardLineIcon />
      </div>
      <p className="dark:text-text-text-and-icon text-h3">Never scanned</p>
    </div>
  );
};

const ScanResultComponent = ({
  scanId,
  scanStatus,
  type,
}: {
  scanId?: string;
  scanStatus: string;
  type: ScanTypeEnum;
}) => {
  const { mode } = useTheme();
  const { data: scanSummary } = useScanResultSummaryCounts(scanId, type);

  return (
    <div>
      <ScanResultHeading
        type={type}
        scanId={!isNeverScanned(scanStatus) && scanId ? scanId : undefined}
        timestamp={
          !isNeverScanned(scanStatus) && scanSummary?.timestamp
            ? scanSummary.timestamp
            : undefined
        }
      />
      <div className="h-[125px]">
        {/* TODO: check below condition */}
        {isScanComplete(scanStatus) && scanSummary && (
          <div className="h-full w-full grid grid-cols-2 items-stretch justify-between">
            <div className="flex items-center justify-center">
              <div className="h-[100px] w-[100px]">
                <ScanResultChart
                  data={getSeriesOption(scanSummary.counts)}
                  theme={mode}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 self-center min-w-[150px] ml-auto pr-8">
              {getSeriesOption(scanSummary.counts).map((count) => {
                return (
                  <div className="flex gap-2 w-full items-center" key={count.name}>
                    <div
                      className="h-[9px] w-[9px] rounded-full shrink-0"
                      style={{
                        backgroundColor: count.color,
                      }}
                    ></div>
                    <div className="capitalize text-p8 dark:text-text-input-value">
                      {count.name}
                    </div>
                    <div className="ml-auto text-p7 dark:text-text-input-value">
                      {abbreviateNumber(count.value)}
                    </div>
                  </div>
                );
              })}
              {!Object.keys(scanSummary.counts).length ? (
                <div className="dark:text-text-text-and-icon pr-3">No issues found</div>
              ) : null}
            </div>
          </div>
        )}
        {isScanFailed(scanStatus) && <ScanStatusError />}
        {isNeverScanned(scanStatus) && <ScanStatusNeverScanned />}
        {isScanInProgress(scanStatus) && <ScanStatusInProgress />}
      </div>
    </div>
  );
};

const ScanCountLoading = () => {
  return (
    <div className="min-h-[166px] flex items-center justify-center">
      <CircleSpinner size="md" />
    </div>
  );
};

export const ScanResult = ({
  vulnerabilityScanId,
  malwareScanId,
  secretScanId,
  complianceScanId,
  vulnerabilityScanStatus,
  malwareScanStatus,
  secretScanStatus,
  complianceScanStatus,
}: {
  vulnerabilityScanId?: string;
  malwareScanId?: string;
  secretScanId?: string;
  complianceScanId?: string;
  vulnerabilityScanStatus?: string;
  malwareScanStatus?: string;
  secretScanStatus?: string;
  complianceScanStatus?: string;
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {!isNil(vulnerabilityScanStatus) && (
        <Card className="rounded-[5px]">
          <Suspense fallback={<ScanCountLoading />}>
            <ScanResultComponent
              scanId={vulnerabilityScanId}
              scanStatus={vulnerabilityScanStatus}
              type={ScanTypeEnum.VulnerabilityScan}
            />
          </Suspense>
        </Card>
      )}
      {!isNil(secretScanStatus) && (
        <Card className="rounded-[5px]">
          <Suspense fallback={<ScanCountLoading />}>
            <ScanResultComponent
              scanId={secretScanId}
              scanStatus={secretScanStatus}
              type={ScanTypeEnum.SecretScan}
            />
          </Suspense>
        </Card>
      )}
      {!isNil(malwareScanStatus) && (
        <Card className="rounded-[5px]">
          <Suspense fallback={<ScanCountLoading />}>
            <ScanResultComponent
              scanId={malwareScanId}
              scanStatus={malwareScanStatus}
              type={ScanTypeEnum.MalwareScan}
            />
          </Suspense>
        </Card>
      )}
      {!isNil(complianceScanStatus) && (
        <Card className="rounded-[5px]">
          <Suspense fallback={<ScanCountLoading />}>
            <ScanResultComponent
              scanId={complianceScanId}
              scanStatus={complianceScanStatus}
              type={ScanTypeEnum.ComplianceScan}
            />
          </Suspense>
        </Card>
      )}
    </div>
  );
};
