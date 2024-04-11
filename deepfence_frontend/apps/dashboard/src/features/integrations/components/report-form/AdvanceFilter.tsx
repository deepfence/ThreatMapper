import { upperCase } from 'lodash-es';
import { useMemo, useState } from 'react';
import { Listbox, ListboxOption } from 'ui-components';

import {
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { isCloudNode, ScanTypeEnum } from '@/types/common';

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
export const API_SCAN_TYPE_MAP: {
  [key: string]: ScanTypeEnum;
} = {
  [UtilsReportFiltersScanTypeEnum.Vulnerability]: ScanTypeEnum.VulnerabilityScan,
  [UtilsReportFiltersScanTypeEnum.Secret]: ScanTypeEnum.SecretScan,
  [UtilsReportFiltersScanTypeEnum.Malware]: ScanTypeEnum.MalwareScan,
  [UtilsReportFiltersScanTypeEnum.Compliance]: ScanTypeEnum.ComplianceScan,
  [UtilsReportFiltersScanTypeEnum.CloudCompliance]: ScanTypeEnum.CloudComplianceScan,
};

export const AdvancedFilter = ({
  resourceType,
  provider,
  deadNodes,
}: {
  resourceType: string;
  provider: string;
  deadNodes: boolean;
}) => {
  const [selectedCloudAccounts, setSelectedCloudAccounts] = useState<string[]>([]);

  const [maskedType, setMaskedType] = useState([]);
  const [status, setStatus] = useState([]);

  const nodeType = useMemo(
    () => getNodeTypeByProviderName(provider.toLowerCase()),
    [provider],
  );

  // to main clear state for combobox
  const [hosts, setHosts] = useState<string[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [containers, setContainers] = useState<string[]>([]);

  return (
    <>
      {resourceType && provider ? (
        <>
          <div className="pt-4 flex text-text-input-value ">
            <div className="text-h5">Advanced Filter (Optional)</div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 pt-4">
            {isCloudNode(nodeType) && (
              <SearchableCloudAccountsList
                label={`${upperCase(provider)} Account`}
                triggerVariant="select"
                defaultSelectedAccounts={selectedCloudAccounts}
                cloudProvider={provider.toLowerCase() as 'aws' | 'gcp' | 'azure'}
                onClearAll={() => {
                  setSelectedCloudAccounts([]);
                }}
                onChange={(value) => {
                  setSelectedCloudAccounts(value);
                }}
              />
            )}
            {nodeType === UtilsReportFiltersNodeTypeEnum.Host ? (
              <>
                <div>
                  <SearchableHostList
                    scanType={API_SCAN_TYPE_MAP[resourceType]}
                    triggerVariant="select"
                    defaultSelectedHosts={hosts}
                    onChange={(value) => {
                      setHosts(value);
                    }}
                    onClearAll={() => {
                      setHosts([]);
                    }}
                    agentRunning={false}
                    active={!deadNodes}
                  />
                </div>
              </>
            ) : null}

            {provider === UtilsReportFiltersNodeTypeEnum.ContainerImage ? (
              <>
                <div>
                  <SearchableImageList
                    scanType={API_SCAN_TYPE_MAP[resourceType]}
                    triggerVariant="select"
                    defaultSelectedImages={images}
                    onChange={(value) => {
                      setImages(value);
                    }}
                    onClearAll={() => {
                      setImages([]);
                    }}
                    active={!deadNodes}
                  />
                </div>
              </>
            ) : null}

            {provider === UtilsReportFiltersNodeTypeEnum.Container ? (
              <>
                <div>
                  <SearchableContainerList
                    scanType={API_SCAN_TYPE_MAP[resourceType]}
                    triggerVariant="select"
                    defaultSelectedContainers={containers}
                    onChange={(value) => {
                      setContainers(value);
                    }}
                    onClearAll={() => {
                      setContainers([]);
                    }}
                    active={!deadNodes}
                  />
                </div>
              </>
            ) : null}

            {resourceType !== UtilsReportFiltersScanTypeEnum.CloudCompliance ? (
              <>
                <div>
                  <SearchableClusterList
                    valueKey="nodeName"
                    triggerVariant="select"
                    defaultSelectedClusters={clusters}
                    onChange={(value) => {
                      setClusters(value);
                    }}
                    onClearAll={() => {
                      setClusters([]);
                    }}
                    agentRunning={false}
                    active={!deadNodes}
                  />
                </div>
              </>
            ) : null}

            {provider && (
              <Listbox
                variant="underline"
                value={maskedType}
                name="mask[]"
                onChange={(value) => {
                  setMaskedType(value);
                }}
                placeholder="Select mask type"
                label="Select Mask/Unmask"
                getDisplayValue={() => {
                  return maskedType.toString();
                }}
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
                variant="underline"
                value={status}
                name="status[]"
                onChange={(value) => {
                  setStatus(value);
                }}
                placeholder="Select status"
                label="Select Status"
                getDisplayValue={() => {
                  return status.toString();
                }}
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
      ) : null}
    </>
  );
};
