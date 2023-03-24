import { IconContext } from 'react-icons';
import {
  HiOutlineExclamationCircle,
  HiOutlineSearch,
  HiOutlineStatusOffline,
} from 'react-icons/hi';
import { generatePath } from 'react-router-dom';

import { ModelScanListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { POSTURE_STATUS_COLORS, SEVERITY_COLORS } from '@/constants/charts';
import { ScanResultChart } from '@/features/topology/components/scan-results/ScanResultChart';
import { LoaderData } from '@/features/topology/data-components/node-details/Host';
import { useTheme } from '@/theme/ThemeContext';
import { ScanTypeEnum } from '@/types/common';
import { sortBySeverity } from '@/utils/array';
import { formatToRelativeTimeFromNow } from '@/utils/date';

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
  );
};

const isScanNeverRun = (scanResult: ModelScanListResp | null) => {
  const scanStatus = scanResult?.scans_info?.[0]?.status;
  return scanResult?.scans_info?.length === 0 || !scanStatus;
};

const isScanRunAnError = (scanResult: ModelScanListResp | null) => {
  const scanStatus = scanResult?.scans_info?.[0]?.status;
  return !!scanStatus && scanStatus === 'ERROR';
};

const isScanCompleted = (scanResult: ModelScanListResp | null) => {
  const scanStatus = scanResult?.scans_info?.[0]?.status;
  return !!scanStatus && scanStatus === 'COMPLETE';
};

const isScanInProgress = (scanResult: ModelScanListResp | null) => {
  const scanStatus = scanResult?.scans_info?.[0]?.status;
  return (
    !!scanStatus &&
    !isScanCompleted(scanResult) &&
    !isScanRunAnError(scanResult) &&
    !isScanNeverRun(scanResult)
  );
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
    title = 'Compliance Scan';
  }
  return (
    <div className="flex items-center gap-x-3">
      <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold uppercase">
        {title}
      </h3>
      {timestamp ? (
        <div className="text-gray-600 dark:text-gray-400 text-xs">
          {formatToRelativeTimeFromNow(timestamp)}
        </div>
      ) : null}
      {scanId && (
        <DFLink
          to={
            type === ScanTypeEnum.ComplianceScan
              ? generatePath('/posture/scan-results/:nodeType/:scanId', {
                  scanId,
                  nodeType: 'host',
                })
              : generatePath(`${scanResultPath}/:scanId`, {
                  scanId,
                })
          }
          className="text-xs underline ml-auto"
        >
          Details
        </DFLink>
      )}
    </div>
  );
};

const ScanStatusError = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <IconContext.Provider
        value={{
          className: 'dark:text-red-600 text-red-400 w-[40px] h-[40px]',
        }}
      >
        <HiOutlineExclamationCircle />
      </IconContext.Provider>
      <p className="text-red-500 text-xs pt-2">Scan Failed</p>
    </div>
  );
};

const ScanStatusInProgress = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <IconContext.Provider
        value={{
          className: 'dark:text-gray-600 text-gray-400 w-[40px] h-[40px]',
        }}
      >
        <HiOutlineSearch />
      </IconContext.Provider>
      <p className="dark:text-gray-400 text-gray-400 text-xs py-3">Scan In Progress...</p>
    </div>
  );
};

const ScanStatusNeverScanned = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <IconContext.Provider
        value={{
          className: 'dark:text-gray-600 text-gray-400 w-[40px] h-[40px]',
        }}
      >
        <HiOutlineStatusOffline />
      </IconContext.Provider>
      <p className="dark:text-gray-400 text-gray-400 text-xs py-3">Never Scanned</p>
    </div>
  );
};

const ScanResultComponent = ({
  result,
  type,
}: {
  result: ModelScanListResp | null;
  type: ScanTypeEnum;
}) => {
  const { mode } = useTheme();
  const secretCounts = {
    ...(result?.scans_info?.[0]?.severity_counts ?? {}),
  };
  return (
    <div>
      <>
        <ScanResultHeading
          type={type}
          scanId={
            !isScanNeverRun(result) && result?.scans_info?.[0]?.scan_id
              ? result?.scans_info?.[0]?.scan_id
              : undefined
          }
          timestamp={
            !isScanNeverRun(result) && result?.scans_info?.[0]?.updated_at
              ? result?.scans_info?.[0]?.updated_at
              : undefined
          }
        />
        <div className="h-[150px]">
          {isScanCompleted(result) && (
            <ScanResultChart data={getSeriesOption(secretCounts)} theme={mode} />
          )}
          {isScanRunAnError(result) && <ScanStatusError />}
          {isScanNeverRun(result) && <ScanStatusNeverScanned />}
          {isScanInProgress(result) && <ScanStatusInProgress />}
        </div>
      </>
    </div>
  );
};

export const ScanResult = ({
  scanResults,
}: {
  scanResults: LoaderData['scanResults'] | undefined;
}) => {
  if (!scanResults) {
    return null;
  }
  const { vulnerabilityResult, secretResult, malwareResult, complianceResult } =
    scanResults;

  return (
    <div className="flex flex-col space-y-2">
      <ScanResultComponent
        result={vulnerabilityResult}
        type={ScanTypeEnum.VulnerabilityScan}
      />
      <ScanResultComponent result={secretResult} type={ScanTypeEnum.SecretScan} />
      <ScanResultComponent result={malwareResult} type={ScanTypeEnum.MalwareScan} />
      <ScanResultComponent result={complianceResult} type={ScanTypeEnum.ComplianceScan} />
    </div>
  );
};
