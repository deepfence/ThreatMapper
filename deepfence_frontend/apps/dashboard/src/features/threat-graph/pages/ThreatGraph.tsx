import { useEffect, useRef, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import {
  Checkbox,
  IconButton,
  Listbox,
  ListboxOption,
  Popover,
  Radio,
} from 'ui-components';

import { GraphNodeInfo } from '@/api/generated';
import { FilterHeader } from '@/components/forms/FilterHeader';
import { useGetCloudAccountsList } from '@/features/common/data-component/searchCloudAccountsApiLoader';
import {
  ThreatGraphComponent,
  ThreatGraphFilters,
} from '@/features/threat-graph/components/ThreatGraph';
import { DetailsModal } from '@/features/threat-graph/data-components/DetailsModal';
import { ThreatGraphNodeModelConfig } from '@/features/threat-graph/utils/threat-graph-custom-node';

const ThreatGraph = () => {
  const [modalData, setModalData] = useState<{
    label: string;
    nodeType: string;
    nodes?: { [key: string]: GraphNodeInfo } | null;
  }>();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<ThreatGraphFilters>({
    type: searchParams.get('type') ?? 'all',
    cloud_resource_only: searchParams.get('cloud_resource_only') === 'true',
    aws_account_ids: searchParams.getAll('aws_account_ids'),
    gcp_account_ids: searchParams.getAll('gcp_account_ids'),
    azure_account_ids: searchParams.getAll('azure_account_ids'),
  });

  useEffect(() => {
    setFilters({
      type: searchParams.get('type') ?? 'all',
      cloud_resource_only: searchParams.get('cloud_resource_only') === 'true',
      aws_account_ids: searchParams.getAll('aws_account_ids'),
      gcp_account_ids: searchParams.getAll('gcp_account_ids'),
      azure_account_ids: searchParams.getAll('azure_account_ids'),
    });
  }, [searchParams]);

  return (
    <div className="h-full flex flex-col">
      <ThreatGraphHeader />
      <div className="m-2 flex-1">
        <ThreatGraphComponent
          onNodeClick={(model: ThreatGraphNodeModelConfig | undefined) => {
            if (!model) return;
            if (model.nonInteractive) return;
            const { label, nodeType, nodes } = model;
            setModalData({ label, nodeType, nodes });
          }}
          filters={filters}
        />
      </div>
      {modalData && (
        <DetailsModal
          open={!!modalData}
          onOpenChange={(open) => {
            if (!open) {
              setModalData(undefined);
            }
          }}
          nodes={modalData.nodes}
          label={modalData.label}
          nodeType={modalData.nodeType}
        />
      )}
    </div>
  );
};

const ThreatGraphHeader = () => {
  const elementToFocusOnClose = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { accounts: AWSAccounts } = useGetCloudAccountsList({
    nodeType: 'aws',
  });
  const { accounts: GCPAccounts } = useGetCloudAccountsList({
    nodeType: 'gcp',
  });
  const { accounts: AzureAccounts } = useGetCloudAccountsList({
    nodeType: 'azure',
  });

  const isFilterApplied =
    (searchParams.get('type') && searchParams.get('type') !== 'all') ||
    searchParams.get('cloud_resource_only') === 'true' ||
    !!searchParams.getAll('aws_account_ids').length ||
    !!searchParams.getAll('gcp_account_ids').length ||
    !!searchParams.getAll('azure_account_ids').length;

  return (
    <div className="flex p-2 w-full shadow bg-white dark:bg-gray-800 justify-between items-center">
      <span className="text-md font-medium text-gray-700 dark:text-gray-200">
        Threat Graph
      </span>
      <div className="relative gap-x-4">
        {isFilterApplied && (
          <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
        )}
        <Popover
          triggerAsChild
          elementToFocusOnCloseRef={elementToFocusOnClose}
          content={
            <div className="dark:text-white min-w-[300px]">
              <FilterHeader
                onReset={() => {
                  setSearchParams({});
                }}
              />
              <form className="flex flex-col gap-y-4 px-4 pt-2 pb-4">
                <fieldset>
                  <legend className="text-sm font-medium">Type</legend>
                  <div className="flex gap-y-4">
                    <Radio
                      direction="col"
                      value={searchParams.get('type') ?? 'all'}
                      onValueChange={(value) => {
                        setSearchParams((prev) => {
                          prev.set('type', value);
                          return prev;
                        });
                      }}
                      options={[
                        {
                          label: 'All',
                          value: 'all',
                        },
                        {
                          label: 'Vulnerability',
                          value: 'vulnerability',
                        },
                        {
                          label: 'Secret',
                          value: 'secret',
                        },
                        {
                          label: 'Malware',
                          value: 'malware',
                        },
                        {
                          label: 'Compliance',
                          value: 'compliance',
                        },
                        {
                          label: 'Cloud Compliance',
                          value: 'cloud_compliance',
                        },
                      ]}
                    />
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-medium">Scope</legend>
                  <div className="flex gap-y-4">
                    <Checkbox
                      label="Show only Cloud Resources"
                      checked={searchParams.get('cloud_resource_only') === 'true'}
                      onCheckedChange={(state) => {
                        setSearchParams((prev) => {
                          prev.set('cloud_resource_only', String(state));
                          return prev;
                        });
                      }}
                    />
                  </div>
                </fieldset>
                {!!AWSAccounts.length && (
                  <fieldset>
                    <legend className="text-sm font-medium">AWS Accounts</legend>
                    <div className="flex gap-y-4">
                      <Listbox
                        sizing="sm"
                        placeholder="Select AWS Accounts"
                        value={searchParams.getAll('aws_account_ids') ?? []}
                        multiple
                        onChange={(value) => {
                          setSearchParams((prev) => {
                            prev.delete('aws_account_ids');
                            value.forEach((v) => {
                              prev.append('aws_account_ids', v);
                            });
                            return prev;
                          });
                        }}
                      >
                        {AWSAccounts?.map((account) => {
                          return (
                            <ListboxOption key={account.node_id} value={account.node_id}>
                              {account.node_name}
                            </ListboxOption>
                          );
                        })}
                      </Listbox>
                    </div>
                  </fieldset>
                )}
                {!!GCPAccounts.length && (
                  <fieldset>
                    <legend className="text-sm font-medium">GCP Accounts</legend>
                    <div className="flex gap-y-4">
                      <Listbox
                        sizing="sm"
                        placeholder="Select GCP Accounts"
                        value={searchParams.getAll('gcp_account_ids') ?? []}
                        multiple
                        onChange={(value) => {
                          setSearchParams((prev) => {
                            prev.delete('gcp_account_ids');
                            value.forEach((v) => {
                              prev.append('gcp_account_ids', v);
                            });
                            return prev;
                          });
                        }}
                      >
                        {GCPAccounts?.map((account) => {
                          return (
                            <ListboxOption key={account.node_id} value={account.node_id}>
                              {account.node_name}
                            </ListboxOption>
                          );
                        })}
                      </Listbox>
                    </div>
                  </fieldset>
                )}
                {!!AzureAccounts.length && (
                  <fieldset>
                    <legend className="text-sm font-medium">Azure Accounts</legend>
                    <div className="flex gap-y-4">
                      <Listbox
                        sizing="sm"
                        placeholder="Select Azure Accounts"
                        value={searchParams.getAll('azure_account_ids') ?? []}
                        multiple
                        onChange={(value) => {
                          setSearchParams((prev) => {
                            prev.delete('azure_account_ids');
                            value.forEach((v) => {
                              prev.append('azure_account_ids', v);
                            });
                            return prev;
                          });
                        }}
                      >
                        {AzureAccounts?.map((account) => {
                          return (
                            <ListboxOption key={account.node_id} value={account.node_id}>
                              {account.node_name}
                            </ListboxOption>
                          );
                        })}
                      </Listbox>
                    </div>
                  </fieldset>
                )}
              </form>
            </div>
          }
        >
          <IconButton
            className="ml-auto rounded-lg"
            size="xxs"
            outline
            color="primary"
            ref={elementToFocusOnClose}
            icon={<FiFilter />}
          />
        </Popover>
      </div>
    </div>
  );
};

export const module = {
  element: <ThreatGraph />,
};
