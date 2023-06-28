import { useMemo, useState } from 'react';
import { Listbox, ListboxOption } from 'ui-components';

import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { useGetCloudAccountsList } from '@/features/common/data-component/searchCloudAccountsApiLoader';
import { CloudNodeType, isCloudNode, ScanTypeEnum } from '@/types/common';

const getNodeTypeByProviderName = (providerName: string): string | undefined => {
  switch (providerName) {
    case 'linux':
    case 'host':
      return 'host';
    case 'aws':
      return 'aws';
    case 'gcp':
      return 'gcp';
    case 'gcp_org':
      return 'gcp_org';
    case 'azure':
      return 'azure';
    case 'kubernetes':
      return 'cluster';
    default:
      return;
  }
};
const API_SCAN_TYPE_MAP: {
  [key: string]: ScanTypeEnum;
} = {
  Vulnerability: ScanTypeEnum.VulnerabilityScan,
  Secret: ScanTypeEnum.SecretScan,
  Malware: ScanTypeEnum.MalwareScan,
  Compliance: ScanTypeEnum.ComplianceScan,
  CloudCompliance: ScanTypeEnum.CloudComplianceScan,
};

export const AdvancedFilter = ({
  resourceType,
  provider,
}: {
  resourceType: string;
  provider: string;
}) => {
  const [selectedCloudAccounts, setSelectedCloudAccounts] = useState([]);

  const [maskedType, setMaskedType] = useState([]);
  const [status, setStatus] = useState([]);
  const nodeType = useMemo(
    () => getNodeTypeByProviderName(provider.toLowerCase()),
    [provider],
  );

  const { accounts: cloudAccounts } = useGetCloudAccountsList({
    nodeType: nodeType as CloudNodeType,
  });

  return (
    <>
      {resourceType && provider ? (
        <>
          <div className="pt-4">
            <button className="flex gap-x-1 items-center dark:text-text-input-value text-h5">
              <span className="w-3 h-3">
                <CaretDown />
              </span>
              Advanced Filter (Optional)
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 pt-4">
            {isCloudNode(nodeType as CloudNodeType) && (
              <Listbox
                value={selectedCloudAccounts}
                name="accountIds[]"
                onChange={(value) => {
                  setSelectedCloudAccounts(value);
                }}
                placeholder="Select accounts"
                label="Select Account (Optional)"
              >
                {cloudAccounts.map((account) => {
                  return (
                    <ListboxOption value={account.node_id} key={account.node_id}>
                      {account.node_name}
                    </ListboxOption>
                  );
                })}
              </Listbox>
            )}
            {nodeType === 'host' ? (
              <>
                <div>
                  <SearchableHostList scanType={API_SCAN_TYPE_MAP[resourceType]} />
                </div>
              </>
            ) : null}

            {provider === 'ContainerImage' ? (
              <>
                <div>
                  <SearchableImageList scanType={API_SCAN_TYPE_MAP[resourceType]} />
                </div>
              </>
            ) : null}

            {provider === 'Container' ? (
              <>
                <div>
                  <SearchableContainerList scanType={API_SCAN_TYPE_MAP[resourceType]} />
                </div>
              </>
            ) : null}

            {resourceType !== 'CloudCompliance' ? (
              <>
                <div>
                  <SearchableClusterList />
                </div>
              </>
            ) : null}

            {provider && (
              <Listbox
                value={maskedType}
                name="mask[]"
                onChange={(value) => {
                  setMaskedType(value);
                }}
                placeholder="Select mask type"
                label="Select Mask/Unmask (Optional)"
              >
                {['Masked', 'Unmasked']?.map((provider) => {
                  return (
                    <ListboxOption value={provider} key={provider}>
                      {provider}
                    </ListboxOption>
                  );
                })}
              </Listbox>
            )}
            {provider && (
              <Listbox
                value={status}
                name="status[]"
                onChange={(value) => {
                  setStatus(value);
                }}
                placeholder="Select Status"
                label="Select Status (Optional)"
              >
                {['COMPLETE', 'ERROR']?.map((provider) => {
                  return (
                    <ListboxOption value={provider} key={provider}>
                      {provider}
                    </ListboxOption>
                  );
                })}
              </Listbox>
            )}
          </div>
        </>
      ) : (
        <div className="pt-4 flex gap-x-1 items-center dark:text-text-input-value ">
          <span className="w-3 h-3 -rotate-90">
            <CaretDown />
          </span>
          <div className="text-h5">Advanced Filter (Optional)</div>
        </div>
      )}
    </>
  );
};
