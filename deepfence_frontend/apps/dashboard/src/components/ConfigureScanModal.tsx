import {
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import { ScanRadarIcon } from '@/components/icons/common/ScanRadar';
import {
  ComplianceScanConfigureForm,
  ComplianceScanConfigureFormProps,
} from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import {
  MalwareScanConfigureForm,
  MalwareScanConfigureFormProps,
} from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import {
  SecretScanConfigureForm,
  SecretScanConfigureFormProps,
} from '@/components/scan-configure-forms/SecretScanConfigureForm';
import {
  VulnerabilityScanConfigureForm,
  VulnerabilityScanConfigureFormProps,
} from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';
import { ScanTypeEnum } from '@/types/common';

export interface ConfigureScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  scanOptions?: { showAdvancedOptions: boolean } & (
    | {
        scanType: typeof ScanTypeEnum.VulnerabilityScan;
        data: VulnerabilityScanConfigureFormProps['data'];
      }
    | {
        scanType: typeof ScanTypeEnum.SecretScan;
        data: SecretScanConfigureFormProps['data'];
      }
    | {
        scanType: typeof ScanTypeEnum.MalwareScan;
        data: MalwareScanConfigureFormProps['data'];
      }
    | {
        scanType: typeof ScanTypeEnum.ComplianceScan;
        data: ComplianceScanConfigureFormProps['data'];
      }
    | {
        scanType: typeof ScanTypeEnum.CloudComplianceScan;
        data: ComplianceScanConfigureFormProps['data'];
      }
  );
}
const Header = ({ title }: { title: string }) => {
  return (
    <SlidingModalHeader>
      <span className="flex w-full dark:bg-bg-header bg-bg-breadcrumb-bar h-[64px] text-text-text-and-icon">
        <span className="px-4 text-h3 inline-flex items-center gap-x-2">
          <span className="w-4 h-4 ">
            <ScanRadarIcon />
          </span>
          New {title}
        </span>
      </span>
    </SlidingModalHeader>
  );
};
export const ConfigureScanModal = ({
  open,
  onSuccess,
  onOpenChange,
  scanOptions,
}: ConfigureScanModalProps) => {
  if (!scanOptions) return null;
  let title = '';

  if (scanOptions.scanType === ScanTypeEnum.VulnerabilityScan) {
    title = `vulnerability scan`;
  } else if (scanOptions.scanType === ScanTypeEnum.SecretScan) {
    title = `secret scan`;
  } else if (scanOptions.scanType === ScanTypeEnum.MalwareScan) {
    title = `malware scan`;
  } else if (
    scanOptions.scanType === ScanTypeEnum.ComplianceScan ||
    scanOptions.scanType === ScanTypeEnum.CloudComplianceScan
  ) {
    title = `posture scan`;
  }

  return (
    <SlidingModal open={open} onOpenChange={onOpenChange} size="l">
      <Header title={title} />
      <SlidingModalCloseButton />
      <SlidingModalContent>
        <div className="p-4">
          {scanOptions.scanType === ScanTypeEnum.VulnerabilityScan && (
            <VulnerabilityScanConfigureForm
              showAdvancedOptions={scanOptions.showAdvancedOptions}
              showScheduleScanOptions={true}
              data={scanOptions.data}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
              onCancel={() => onOpenChange(false)}
            />
          )}
          {scanOptions.scanType === ScanTypeEnum.SecretScan && (
            <SecretScanConfigureForm
              showAdvancedOptions={scanOptions.showAdvancedOptions}
              showScheduleScanOptions={true}
              data={scanOptions.data}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
              onCancel={() => onOpenChange(false)}
            />
          )}
          {scanOptions.scanType === ScanTypeEnum.MalwareScan && (
            <MalwareScanConfigureForm
              showAdvancedOptions={scanOptions.showAdvancedOptions}
              showScheduleScanOptions={true}
              data={scanOptions.data}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
              onCancel={() => onOpenChange(false)}
            />
          )}
          {(scanOptions.scanType === ScanTypeEnum.ComplianceScan ||
            scanOptions.scanType === ScanTypeEnum.CloudComplianceScan) && (
            <ComplianceScanConfigureForm
              showAdvancedOptions={scanOptions.showAdvancedOptions}
              showScheduleScanOptions={true}
              data={scanOptions.data}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </div>
      </SlidingModalContent>
    </SlidingModal>
  );
};
