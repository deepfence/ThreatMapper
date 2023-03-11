import { useFetcher } from 'react-router-dom';
import { Modal } from 'ui-components';

import { MalwareScanConfigureForm } from '@/components/registries-scan/MalwareScanConfigureForm';
import { SecretScanConfigureForm } from '@/components/registries-scan/SecretScanConfigureForm';
import { VulnerabilityScanConfigureForm } from '@/components/registries-scan/VulnerabilityScanConfigureForm';

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
  const fetcher = useFetcher();

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
          loading={fetcher.state === 'submitting'}
          data={{
            urlIds: data.urlIds,
            urlType: data.urlType,
          }}
        />
      )}
      {scanType === ActionEnumType.SCAN_SECRET && (
        <SecretScanConfigureForm
          loading={fetcher.state === 'submitting'}
          data={{
            urlIds: data.urlIds,
            urlType: data.urlType,
          }}
        />
      )}
      {scanType === ActionEnumType.SCAN_MALWARE && (
        <MalwareScanConfigureForm
          loading={fetcher.state === 'submitting'}
          data={{
            urlIds: data.urlIds,
            urlType: data.urlType,
          }}
        />
      )}
    </Modal>
  );
};
