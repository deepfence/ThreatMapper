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

export const ConfigureScanModal = ({
  open,
  wantAdvanceOptions,
  setOpen,
  scanType,
  data,
}: {
  open: boolean;
  wantAdvanceOptions: boolean;
  setOpen: React.Dispatch<React.SetStateAction<string>>;
  scanType: string;
  data: {
    nodeIds: string[];
    nodeType: 'cluster' | 'host' | 'registry' | 'image' | 'imageTag';
    images?: string[];
  };
}) => {
  let title = '';

  if (scanType === VulnerabilityScanActionEnumType.SCAN_VULNERABILITY) {
    title = `Configure vulnerability scan option`;
  } else if (scanType === SecretScanActionEnumType.SCAN_SECRET) {
    title = `Configure secret scan option`;
  } else if (scanType === MalwareScanActionEnumType.SCAN_MALWARE) {
    title = `Configure malware scan option`;
  }

  return (
    <Modal open={open} width="w-full" title={title} onOpenChange={() => setOpen('')}>
      {scanType === VulnerabilityScanActionEnumType.SCAN_VULNERABILITY && (
        <VulnerabilityScanConfigureForm
          wantAdvanceOptions={wantAdvanceOptions}
          data={{
            nodeIds: data.nodeIds,
            nodeType: data.nodeType,
            images: data.images ?? [],
          }}
          onSuccess={() => setOpen('')}
        />
      )}
      {scanType === SecretScanActionEnumType.SCAN_SECRET && (
        <SecretScanConfigureForm
          wantAdvanceOptions={true}
          data={{
            nodeIds: data.nodeIds,
            nodeType: data.nodeType,
            images: data.images ?? [],
          }}
          onSuccess={() => setOpen('')}
        />
      )}
      {scanType === MalwareScanActionEnumType.SCAN_MALWARE && (
        <MalwareScanConfigureForm
          wantAdvanceOptions={true}
          data={{
            nodeIds: data.nodeIds,
            nodeType: data.nodeType,
            images: data.images ?? [],
          }}
          onSuccess={() => setOpen('')}
        />
      )}
    </Modal>
  );
};
