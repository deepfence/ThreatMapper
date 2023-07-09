import cx from 'classnames';
import { Tooltip } from 'ui-components';

import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';
import { ScanTypeEnum } from '@/types/common';

export const ScanStatusInProgress = ({ LogoIcon }: { LogoIcon: () => JSX.Element }) => {
  return (
    <div className={cx('flex flex-col items-center justify-center mt-40')}>
      <div className="bg-red-100 dark:bg-status-success rounded-lg flex items-center justify-center p-4">
        <div className="w-14 h-14 text-red-500 dark:text-red-400">
          <LogoIcon />
        </div>
      </div>
      <span className="text-2xl font-medium text-gray-700 dark:text-white">
        Scan In Progress
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Scan is running, please check back later
      </span>
    </div>
  );
};

export const ScanStatusInError = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className={cx('flex items-center justify-center mt-40 gap-x-4')}>
      {errorMessage ? (
        <Tooltip content={<span>{errorMessage}</span>}>
          <div className="w-6 h-6 dark:text-status-error  rounded-full">
            <ErrorStandardSolidIcon />
          </div>
        </Tooltip>
      ) : (
        <div className="w-6 h-6 dark:text-status-error  rounded-full">
          <ErrorStandardSolidIcon />
        </div>
      )}

      <div className="flex flex-col text-h3 dark:text-text-text-and-icon">
        Scan failed.
        <br />
        You can run the scan again.
      </div>
    </div>
  );
};

export const NoIssueFound = ({
  LogoIcon,
  scanType,
}: {
  LogoIcon: () => JSX.Element;
  scanType: ScanTypeEnum;
}) => {
  return (
    <div className="flex flex-col items-center justify-center mt-40">
      <div className="h-16 w-16">
        <LogoIcon />
      </div>
      <span className="text-2xl font-medium text-gray-700 dark:text-white">
        {scanType === ScanTypeEnum.VulnerabilityScan && 'Vulnerability Scan'}
        {scanType === ScanTypeEnum.SecretScan && 'Secret Scan'}
        {scanType === ScanTypeEnum.MalwareScan && 'Malware Scan'}
        {scanType === ScanTypeEnum.ComplianceScan && 'Posture Scan'}
        {scanType === ScanTypeEnum.CloudComplianceScan && 'Cloud Posture Scan'}
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        You have no
        {scanType === ScanTypeEnum.VulnerabilityScan &&
          ' vulnerabilities for vulnerability scan'}
        {scanType === ScanTypeEnum.SecretScan && ' secrets for secret scan'}
        {scanType === ScanTypeEnum.MalwareScan && ' malwares for malware scan'}
        {scanType === ScanTypeEnum.ComplianceScan && ' compliances for posture scan'}
        {scanType === ScanTypeEnum.CloudComplianceScan &&
          ' compliances for cloud posture Scan'}
      </span>
    </div>
  );
};
