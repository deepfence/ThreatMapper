import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUpdateEffect } from 'react-use';
import { Listbox, ListboxOption } from 'ui-components';

import {
  ModelCloudComplianceStatusEnum,
  ModelComplianceStatusEnum,
  ModelIntegrationFilters,
} from '@/api/generated';
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { ScanTypeEnum } from '@/types/common';
import {
  getPostureStatusPrettyName,
  getSeverityPrettyName,
  SeverityEnumList,
} from '@/utils/enum';

import { severityMap } from '../../pages/IntegrationAdd';
import {
  API_SCAN_TYPE_MAP,
  getCloudAccountsFilter,
  getClustersFilter,
  getHostsFilter,
  getImagesFilter,
  IntegrationType,
  isCloudComplianceNotification,
  isComplianceNotification,
  scanTypes,
} from './utils';

const sendSummaryList = [
  {
    value: true,
    label: 'Send scan summary',
  },
  {
    value: false,
    label: 'Send complete scan results',
  },
];

const SendSummary = ({ sendSummary }: { sendSummary: boolean | undefined }) => {
  const [value, setValue] = useState(!!sendSummary);
  return (
    <Listbox
      name="sendSummary"
      getDisplayValue={() => sendSummaryList.find((item) => item.value === value)!.label}
      value={value}
      variant="underline"
      onChange={(value) => {
        setValue(value);
      }}
      label="Send summary"
      labelInfo="Either send scan summary or send complete scan results"
    >
      {sendSummaryList.map((item) => {
        return (
          <ListboxOption key={item.label} value={item.value}>
            {item.label}
          </ListboxOption>
        );
      })}
    </Listbox>
  );
};
/**
 *
 * @param notificationType
 * @returns boolean when scan type is vulnerability, secret, malware or compliance and
 * integration is slack or teams
 */
const canSendScanSummary = (notificationType: string) => {
  const { integrationType } = useParams() as {
    integrationType: string;
  };
  return (
    ((integrationType === IntegrationType.slack ||
      integrationType === IntegrationType.microsoftTeams) &&
      scanTypes.includes(notificationType)) ||
    isComplianceNotification(notificationType) ||
    isCloudComplianceNotification(notificationType)
  );
};

export const AdvancedFilters = ({
  notificationType,
  cloudProvider,
  filters,
}: {
  notificationType: string;
  cloudProvider?: string;
  filters?: ModelIntegrationFilters & { sendSummary: boolean };
}) => {
  const fieldFilters = filters?.fields_filters;
  // severity
  const severityFilter =
    fieldFilters?.contains_filter?.filter_in?.[
      severityMap[notificationType ?? ''] || 'severity'
    ];
  // status for compliance
  const statusFilter = fieldFilters?.contains_filter?.filter_in?.['status'];

  const [selectedSeverity, setSelectedSeverity] = useState<string[]>(
    severityFilter ?? [],
  );

  // status
  const [selectedStatus, setSelectedStatus] = useState<string[]>(statusFilter ?? []);

  // to main clear state for combobox
  const [hosts, setHosts] = useState<string[]>(getHostsFilter(filters?.node_ids));
  const [images, setImages] = useState<string[]>(getImagesFilter(filters?.node_ids));
  const [containers, setContainers] = useState<string[]>(filters?.container_names ?? []);
  const [clusters, setClusters] = useState<string[]>(
    getClustersFilter(filters?.node_ids),
  );
  const [selectedCloudAccounts, setSelectedCloudAccounts] = useState<string[]>(
    getCloudAccountsFilter(filters?.node_ids),
  );

  useUpdateEffect(() => {
    setSelectedSeverity([]);
    setSelectedStatus([]);
    setHosts([]);
    setImages([]);
    setContainers([]);
    setClusters([]);
    setSelectedCloudAccounts([]);
  }, [notificationType, cloudProvider]);

  return (
    <div className="col-span-2 mt-6">
      <div className="flex text-text-input-value ">
        <div className="text-h5">Advanced Filter (Optional)</div>
      </div>
      <div className="grid grid-cols-2 gap-y-8 gap-x-8 pt-4">
        {canSendScanSummary(notificationType) ? (
          <SendSummary sendSummary={filters?.sendSummary} />
        ) : null}

        {isCloudComplianceNotification(notificationType) && cloudProvider ? (
          <SearchableCloudAccountsList
            label={`${cloudProvider} Account`}
            triggerVariant="select"
            defaultSelectedAccounts={selectedCloudAccounts}
            cloudProvider={cloudProvider.toLowerCase() as 'aws' | 'gcp' | 'azure'}
            onClearAll={() => {
              setSelectedCloudAccounts([]);
            }}
            onChange={(value) => {
              setSelectedCloudAccounts(value);
            }}
          />
        ) : (
          <SearchableHostList
            scanType={API_SCAN_TYPE_MAP[notificationType]}
            triggerVariant="select"
            defaultSelectedHosts={hosts}
            onChange={(value) => {
              setHosts(value);
            }}
            onClearAll={() => {
              setHosts([]);
            }}
            agentRunning={false}
            active={false}
          />
        )}
        {!isComplianceNotification(notificationType) &&
          !isCloudComplianceNotification(notificationType) && (
            <SearchableContainerList
              scanType={API_SCAN_TYPE_MAP[notificationType]}
              triggerVariant="select"
              defaultSelectedContainers={containers}
              onChange={(value) => {
                setContainers(value);
              }}
              onClearAll={() => {
                setContainers([]);
              }}
              active={false}
              valueKey="nodeName"
            />
          )}
        {!isComplianceNotification(notificationType) &&
          !isCloudComplianceNotification(notificationType) && (
            <SearchableImageList
              scanType={API_SCAN_TYPE_MAP[notificationType]}
              triggerVariant="select"
              defaultSelectedImages={images}
              onChange={(value) => {
                setImages(value);
              }}
              onClearAll={() => {
                setImages([]);
              }}
            />
          )}
        {!isCloudComplianceNotification(notificationType) && (
          <SearchableClusterList
            triggerVariant="select"
            defaultSelectedClusters={clusters}
            onChange={(value) => {
              setClusters(value);
            }}
            onClearAll={() => {
              setClusters([]);
            }}
            agentRunning={false}
            active={false}
          />
        )}

        {isComplianceNotification(notificationType) ||
        isCloudComplianceNotification(notificationType) ? (
          <>
            {isComplianceNotification(notificationType) && (
              <Listbox
                variant="underline"
                value={selectedStatus}
                name="statusFilter"
                onChange={(value) => {
                  setSelectedStatus(value);
                }}
                placeholder="Select status"
                label="Select status"
                multiple
                clearAll="Clear"
                onClearAll={() => setSelectedStatus([])}
                getDisplayValue={(value) => {
                  return value && value.length ? `${value.length} selected` : '';
                }}
              >
                <div className="px-3 pt-2 text-p3 text-text-text-and-icon">Host</div>
                <ListboxOption value={ModelComplianceStatusEnum.Pass}>
                  {getPostureStatusPrettyName(ModelComplianceStatusEnum.Pass)}
                </ListboxOption>
                <ListboxOption value={ModelComplianceStatusEnum.Warn}>
                  {getPostureStatusPrettyName(ModelComplianceStatusEnum.Warn)}
                </ListboxOption>
                <ListboxOption value={ModelComplianceStatusEnum.Note}>
                  {getPostureStatusPrettyName(ModelComplianceStatusEnum.Note)}
                </ListboxOption>
                <div className="px-3 pt-4 text-p3 text-text-text-and-icon">
                  Kubernetes
                </div>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Alarm}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Alarm)}
                </ListboxOption>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Ok}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Ok)}
                </ListboxOption>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Skip}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Skip)}
                </ListboxOption>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Delete}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Delete)}
                </ListboxOption>
                <div className="px-3 pt-4 text-p3 text-text-text-and-icon">Common</div>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Info}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Info)}
                </ListboxOption>
              </Listbox>
            )}
            {isCloudComplianceNotification(notificationType) && (
              <Listbox
                variant="underline"
                value={selectedStatus}
                name="statusFilter"
                onChange={(value) => {
                  setSelectedStatus(value);
                }}
                placeholder="Select status"
                label="Select status"
                multiple
                clearAll="Clear"
                onClearAll={() => setSelectedStatus([])}
                getDisplayValue={(value) => {
                  return value && value.length ? `${value.length} selected` : '';
                }}
              >
                {Object.values(ModelCloudComplianceStatusEnum).map((status) => {
                  return (
                    <ListboxOption key={status} value={status}>
                      {getPostureStatusPrettyName(status)}
                    </ListboxOption>
                  );
                })}
              </Listbox>
            )}
          </>
        ) : null}

        {scanTypes.includes(notificationType as ScanTypeEnum) ? (
          <>
            <Listbox
              variant="underline"
              value={selectedSeverity}
              name="severityFilter"
              onChange={(value) => {
                setSelectedSeverity(value);
              }}
              placeholder="Select severity"
              label="Select severity"
              multiple
              clearAll="Clear"
              onClearAll={() => setSelectedSeverity([])}
              getDisplayValue={(value) => {
                return value && value.length ? `${value.length} selected` : '';
              }}
            >
              {SeverityEnumList.map((severity) => {
                return (
                  <ListboxOption key={severity} value={severity}>
                    {getSeverityPrettyName(severity)}
                  </ListboxOption>
                );
              })}
            </Listbox>
          </>
        ) : null}
      </div>
    </div>
  );
};
