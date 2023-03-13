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
    urlIds: string[];
    urlType: string;
  };
}) => {
  return (
    <Modal
      open={open}
      width="w-full"
      title={`Configure scan option`}
      onOpenChange={() => setOpen('')}
    >
      {scanType === ActionEnumType.SCAN_VULNERABILITY && (
        <VulnerabilityScanConfigureForm
          wantAdvanceOptions={wantAdvanceOptions}
          data={{
            urlIds: data.urlIds,
            urlType: data.urlType,
          }}
          onSuccess={() => setOpen('')}
        />
      )}
      {scanType === ActionEnumType.SCAN_SECRET && (
        <SecretScanConfigureForm
          data={{
            urlIds: data.urlIds,
            urlType: data.urlType,
          }}
          onSuccess={() => setOpen('')}
        />
      )}
      {scanType === ActionEnumType.SCAN_MALWARE && (
        <MalwareScanConfigureForm
          data={{
            urlIds: data.urlIds,
            urlType: data.urlType,
          }}
          onSuccess={() => setOpen('')}
        />
      )}
    </Modal>
  );
};
