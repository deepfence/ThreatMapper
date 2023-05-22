import cx from 'classnames';
import { IconContext } from 'react-icons';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

import { ScanTypeEnum } from '@/types/common';

export const ScanStatusInProgress = ({ LogoIcon }: { LogoIcon: () => JSX.Element }) => {
  return (
    <div className={cx('flex flex-col items-center justify-center mt-40')}>
      <div className="bg-red-100 dark:bg-red-500/10 rounded-lg flex items-center justify-center p-4">
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

export const ScanStatusInError = () => {
  return (
    <div className={cx('flex flex-col items-center justify-center mt-40')}>
      <div className="bg-red-100 dark:bg-red-500/10 rounded-lg flex items-center justify-center p-4">
        <IconContext.Provider
          value={{
            className: 'dark:text-gray-600 text-gray-400 w-[70px] h-[70px]',
          }}
        >
          <HiOutlineExclamationCircle />
        </IconContext.Provider>
      </div>
      <span className="text-2xl font-medium text-red-500/80">Scan Error</span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Please check deepfence console logs for more details.
      </span>
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
        {scanType === ScanTypeEnum.ComplianceScan && 'Compliance Scan'}
        {scanType === ScanTypeEnum.CloudComplianceScan && 'Cloud Compliance Scan'}
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        You have no
        {scanType === ScanTypeEnum.VulnerabilityScan &&
          ' vulnerabilities for vulnerability scan'}
        {scanType === ScanTypeEnum.SecretScan && ' secrets for secret scan'}
        {scanType === ScanTypeEnum.MalwareScan && ' malwares for malware scan'}
        {scanType === ScanTypeEnum.ComplianceScan && ' compliances for compliance scan'}
        {scanType === ScanTypeEnum.CloudComplianceScan &&
          ' compliances for Cloud Compliance Scan'}
      </span>
    </div>
  );
};
