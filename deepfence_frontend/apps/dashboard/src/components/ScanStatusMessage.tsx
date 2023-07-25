import cx from 'classnames';
import { CircleSpinner, Tooltip } from 'ui-components';

import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';
import { ScanTypeEnum } from '@/types/common';

export const ScanStatusInProgress = () => {
  return (
    <div className={cx('flex items-center justify-center gap-x-2')}>
      <CircleSpinner size="md" />
      <span className="text-h3 font-medium dark:text-text-text-and-icon">
        Scan is in progress, please wait...
      </span>
    </div>
  );
};

export const ScanStatusInError = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className={cx('flex items-center justify-center gap-x-2')}>
      {errorMessage ? (
        <Tooltip content={errorMessage}>
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
        Scan failed
      </div>
    </div>
  );
};

export const ScanStatusNoData = ({ message }: { message?: string }) => {
  return (
    <div className="flex-1 flex gap-2 items-center justify-center p-6 dark:text-text-text-and-icon">
      <div className="h-6 w-6 shrink-0">
        <ErrorStandardLineIcon />
      </div>
      <div className="text-h3">{message ?? 'No data available'}</div>
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
