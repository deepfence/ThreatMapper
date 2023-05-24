import { isNil } from 'lodash-es';
import { IconContext } from 'react-icons';
import {
  HiOutlineExclamationCircle,
  HiOutlineSearch,
  HiOutlineStatusOffline,
} from 'react-icons/hi';
import { generatePath } from 'react-router-dom';

import { DFLink } from '@/components/DFLink';
import { POSTURE_STATUS_COLORS, SEVERITY_COLORS } from '@/constants/charts';
import { ScanResultChart } from '@/features/topology/components/scan-results/ScanResultChart';
import { ScanSummary } from '@/features/topology/types/node-details';
import { useTheme } from '@/theme/ThemeContext';
import { ScanTypeEnum } from '@/types/common';
import { sortBySeverity } from '@/utils/array';
import { formatToRelativeTimeFromNow } from '@/utils/date';
import {
  isNeverScanned,
  isScanComplete,
  isScanFailed,
  isScanInProgress,
} from '@/utils/scan';

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
    <div className="flex items-center gap-x-3">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
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
  status,
  scanSummary,
  type,
}: {
  status: string;
  scanSummary?: ScanSummary | null;
  type: ScanTypeEnum;
}) => {
  const { mode } = useTheme();
  const severityCounts = {
    ...(scanSummary?.counts ?? {}),
  };
  return (
    <div>
      <>
        <ScanResultHeading
          type={type}
          scanId={
            !isNeverScanned(status) && scanSummary?.scanId
              ? scanSummary.scanId
              : undefined
          }
          timestamp={
            !isNeverScanned(status) && scanSummary?.timestamp
              ? scanSummary.timestamp
              : undefined
          }
        />
        <div className="h-[150px]">
          {isScanComplete(status) && (
            <ScanResultChart data={getSeriesOption(severityCounts)} theme={mode} />
          )}
          {isScanFailed(status) && <ScanStatusError />}
          {isNeverScanned(status) && <ScanStatusNeverScanned />}
          {isScanInProgress(status) && <ScanStatusInProgress />}
        </div>
      </>
    </div>
  );
};

export const ScanResult = ({
  vulnerabilityScanStatus,
  secretScanStatus,
  malwareScanStatus,
  complianceScanStatus,
  vulnerabilityScanSummary,
  secretScanSummary,
  malwareScanSummary,
  complianceScanSummary,
}: {
  vulnerabilityScanStatus?: string;
  secretScanStatus?: string;
  malwareScanStatus?: string;
  complianceScanStatus?: string;
  vulnerabilityScanSummary?: ScanSummary | null;
  secretScanSummary?: ScanSummary | null;
  malwareScanSummary?: ScanSummary | null;
  complianceScanSummary?: ScanSummary | null;
}) => {
  return (
    <div className="flex flex-col space-y-2">
      {!isNil(vulnerabilityScanStatus) && (
        <ScanResultComponent
          status={vulnerabilityScanStatus}
          scanSummary={vulnerabilityScanSummary}
          type={ScanTypeEnum.VulnerabilityScan}
        />
      )}
      {!isNil(secretScanStatus) && (
        <ScanResultComponent
          status={secretScanStatus}
          scanSummary={secretScanSummary}
          type={ScanTypeEnum.SecretScan}
        />
      )}
      {!isNil(malwareScanStatus) && (
        <ScanResultComponent
          status={malwareScanStatus}
          scanSummary={malwareScanSummary}
          type={ScanTypeEnum.MalwareScan}
        />
      )}
      {!isNil(complianceScanStatus) && (
        <ScanResultComponent
          status={complianceScanStatus}
          scanSummary={complianceScanSummary}
          type={ScanTypeEnum.ComplianceScan}
        />
      )}
    </div>
  );
};
