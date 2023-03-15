import { Modal } from 'ui-components';

import { MalwareScanConfigureForm } from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import { SecretScanConfigureForm } from '@/components/scan-configure-forms/SecretScanConfigureForm';
import { VulnerabilityScanConfigureForm } from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';

export enum ActionEnumType {
  SCAN_VULNERABILITY = 'scan_vulnerability',
  SCAN_SECRET = 'scan_secret',
  SCAN_MALWARE = 'scan_malware',
}
export const ScanConfigureModal = ({
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

  if (scanType === ActionEnumType.SCAN_VULNERABILITY) {
    title = `Configure vulnerability scan option`;
  } else if (scanType === ActionEnumType.SCAN_SECRET) {
    title = `Configure secret scan option`;
  } else if (scanType === ActionEnumType.SCAN_MALWARE) {
    title = `Configure malware scan option`;
  }

  return (
    <Modal open={open} width="w-full" title={title} onOpenChange={() => setOpen('')}>
      {scanType === ActionEnumType.SCAN_VULNERABILITY && (
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
      {scanType === ActionEnumType.SCAN_SECRET && (
        <SecretScanConfigureForm
          data={{
            nodeIds: data.nodeIds,
            nodeType: data.nodeType,
            images: data.images ?? [],
          }}
          onSuccess={() => setOpen('')}
        />
      )}
      {scanType === ActionEnumType.SCAN_MALWARE && (
        <MalwareScanConfigureForm
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
