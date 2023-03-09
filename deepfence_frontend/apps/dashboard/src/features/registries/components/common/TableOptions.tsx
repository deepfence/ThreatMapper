import { useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { HiSearchCircle } from 'react-icons/hi';
import {
  Button,
  Dropdown,
  DropdownItem,
  ModalHeader,
  RowSelectionState,
  SlidingModal,
} from 'ui-components';

import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { MalwareScanModal } from '@/features/registries/components/common/scan-options/MalwareScanModal';
import { ScanModalHeader } from '@/features/registries/components/common/scan-options/ScanModalHeader';
import { SecretScanModal } from '@/features/registries/components/common/scan-options/SecretScanModal';
import { VulnerabilityScanModal } from '@/features/registries/components/common/scan-options/VulnerabilityScanModal';

export type metaheader = {
  key: string;
  value: number;
};

//todo: remove this
const WhatToScan = ({ selection }: { selection: RowSelectionState }) => {
  return (
    <div className="flex flex-col">
      {Object.keys(selection).map((key) => {
        return <div key={key}>{key}</div>;
      })}
    </div>
  );
};
export const TableOptions = ({
  selection,
  enableScanBy,
}: {
  selection: RowSelectionState;
  enableScanBy?: boolean;
}) => {
  const [openVulnerability, setOpenVulnerability] = useState(false);
  const [openMalware, setOpenMalware] = useState(false);
  const [openSecrets, setOpenSecrets] = useState(false);
  const ref = useRef(null);

  console.log('selections:', selection);
  return (
    <div className="flex ml-auto">
      <Dropdown
        content={
          <>
            <DropdownItem
              onClick={() => {
                setOpenVulnerability(true);
              }}
            >
              <div className="text-blue-500 dark:text-blue-400 w-4 h-4 group-hover:text-gray-900 dark:group-hover:text-white shrink-0">
                <VulnerabilityIcon />
              </div>
              <span className="text-blue-500 dark:text-blue-400 group-hover:text-gray-900 dark:group-hover:text-white shrink-0">
                Scan for Vulnerability
              </span>
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                setOpenSecrets(true);
              }}
            >
              <div className="text-blue-500 dark:text-blue-400 w-4 h-4 group-hover:text-gray-900 dark:group-hover:text-white shrink-0">
                <SecretsIcon />
              </div>
              <span className="text-blue-500 dark:text-blue-400 group-hover:text-gray-900 dark:group-hover:text-white shrink-0">
                Scan for Secret
              </span>
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                setOpenMalware(true);
              }}
            >
              <div className="text-blue-500 dark:text-blue-400 w-4 h-4 group-hover:text-gray-900 dark:group-hover:text-white shrink-0">
                <MalwareIcon />
              </div>
              <span className="text-blue-500 dark:text-blue-400 group-hover:text-gray-900 dark:group-hover:text-white shrink-0">
                Scan for Malware
              </span>
            </DropdownItem>
          </>
        }
      >
        <Button outline size="xs" endIcon={<FaChevronDown />}>
          Scan selected
        </Button>
      </Dropdown>
      <SlidingModal
        width="w-3/12"
        header={
          <ScanModalHeader
            header="Registry Vulnerability Scan"
            Icon={<HiSearchCircle />}
          />
        }
        open={openVulnerability}
        onOpenChange={() => setOpenVulnerability(false)}
        elementToFocusOnCloseRef={ref}
      >
        <VulnerabilityScanModal selection={selection} enableScanBy={enableScanBy} />
      </SlidingModal>
      <SlidingModal
        width="w-3/12"
        header={
          <ScanModalHeader header="Registry Malware Scan" Icon={<HiSearchCircle />} />
        }
        open={openMalware}
        onOpenChange={() => setOpenMalware(false)}
        elementToFocusOnCloseRef={ref}
      >
        <MalwareScanModal selection={selection} />
      </SlidingModal>
      <SlidingModal
        width="w-3/12"
        header={
          <ScanModalHeader header="Registry Secret Scan" Icon={<HiSearchCircle />} />
        }
        open={openSecrets}
        onOpenChange={() => setOpenSecrets(false)}
        elementToFocusOnCloseRef={ref}
      >
        <SecretScanModal selection={selection} />
      </SlidingModal>
    </div>
  );
};
