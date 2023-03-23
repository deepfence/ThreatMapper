import { Modal } from 'ui-components';

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
  );
}

export const ConfigureScanModal = ({
  open,
  onOpenChange,
  scanOptions,
}: ConfigureScanModalProps) => {
  if (!scanOptions) return null;
  let title = '';

  if (scanOptions.scanType === ScanTypeEnum.VulnerabilityScan) {
    title = `Configure vulnerability scan`;
  } else if (scanOptions.scanType === ScanTypeEnum.SecretScan) {
    title = `Configure secret scan`;
  } else if (scanOptions.scanType === ScanTypeEnum.MalwareScan) {
    title = `Configure malware scan`;
  }

  return (
    <Modal open={open} width="w-full" title={title} onOpenChange={onOpenChange}>
      {scanOptions.scanType === ScanTypeEnum.VulnerabilityScan && (
        <VulnerabilityScanConfigureForm
          showAdvancedOptions={scanOptions.showAdvancedOptions}
          data={scanOptions.data}
          onSuccess={() => onOpenChange(false)}
        />
      )}
      {scanOptions.scanType === ScanTypeEnum.SecretScan && (
        <SecretScanConfigureForm
          showAdvancedOptions={scanOptions.showAdvancedOptions}
          data={scanOptions.data}
          onSuccess={() => onOpenChange(false)}
        />
      )}
      {scanOptions.scanType === ScanTypeEnum.MalwareScan && (
        <MalwareScanConfigureForm
          showAdvancedOptions={scanOptions.showAdvancedOptions}
          data={scanOptions.data}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </Modal>
  );
};
