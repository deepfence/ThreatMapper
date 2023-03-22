import { Modal } from 'ui-components';

import {
  MalwareScanActionEnumType,
  MalwareScanConfigureForm,
} from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import {
  SecretScanActionEnumType,
  SecretScanConfigureForm,
} from '@/components/scan-configure-forms/SecretScanConfigureForm';
import {
  VulnerabilityScanActionEnumType,
  VulnerabilityScanConfigureForm,
} from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';

export interface ConfigureScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanOptions?: {
    showAdvancedOptions: boolean;
    scanType: string;
    nodeIds: string[];
    nodeType: 'cluster' | 'host' | 'registry' | 'image' | 'imageTag';
    images?: string[];
  };
}

export const ConfigureScanModal = ({
  open,
  onOpenChange,
  scanOptions,
}: ConfigureScanModalProps) => {
  if (!scanOptions) return null;
  let title = '';

  if (scanOptions.scanType === VulnerabilityScanActionEnumType.SCAN_VULNERABILITY) {
    title = `Configure vulnerability scan`;
  } else if (scanOptions.scanType === SecretScanActionEnumType.SCAN_SECRET) {
    title = `Configure secret scan`;
  } else if (scanOptions.scanType === MalwareScanActionEnumType.SCAN_MALWARE) {
    title = `Configure malware scan`;
  }

  return (
    <Modal open={open} width="w-full" title={title} onOpenChange={onOpenChange}>
      {scanOptions.scanType === VulnerabilityScanActionEnumType.SCAN_VULNERABILITY && (
        <VulnerabilityScanConfigureForm
          wantAdvanceOptions={scanOptions.showAdvancedOptions}
          data={{
            nodeIds: scanOptions.nodeIds,
            nodeType: scanOptions.nodeType,
            images: scanOptions.images ?? [],
          }}
          onSuccess={() => onOpenChange(false)}
        />
      )}
      {scanOptions.scanType === SecretScanActionEnumType.SCAN_SECRET && (
        <SecretScanConfigureForm
          wantAdvanceOptions={scanOptions.showAdvancedOptions}
          data={{
            nodeIds: scanOptions.nodeIds,
            nodeType: scanOptions.nodeType,
            images: scanOptions.images ?? [],
          }}
          onSuccess={() => onOpenChange(false)}
        />
      )}
      {scanOptions.scanType === MalwareScanActionEnumType.SCAN_MALWARE && (
        <MalwareScanConfigureForm
          wantAdvanceOptions={scanOptions.showAdvancedOptions}
          data={{
            nodeIds: scanOptions.nodeIds,
            nodeType: scanOptions.nodeType,
            images: scanOptions.images ?? [],
          }}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </Modal>
  );
};
