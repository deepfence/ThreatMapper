import { Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { GraphNodeInfo, GraphThreatFiltersTypeEnum } from '@/api/generated';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { ThreatGraphIcon } from '@/components/sideNavigation/icons/ThreatGraph';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { ThreatGraphComponent } from '@/features/threat-graph/components/ThreatGraph';
import { DetailsModal } from '@/features/threat-graph/data-components/DetailsModal';
import { ThreatGraphNodeModelConfig } from '@/features/threat-graph/utils/threat-graph-custom-node';
import { THEME_LIGHT, useTheme } from '@/theme/ThemeContext';

const ThreatGraph = () => {
  const [modalData, setModalData] = useState<{
    label: string;
    nodeType: string;
    nodes?: { [key: string]: GraphNodeInfo } | null;
    cloudId: string;
  }>();
  const { mode } = useTheme();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <ThreatGraphHeader setIsFilterOpen={setIsFilterOpen} />
      <div
        className="flex-1 flex flex-col"
        style={{
          mixBlendMode: mode === THEME_LIGHT ? 'multiply' : 'normal',
          background:
            mode === 'dark'
              ? 'radial-gradient(48.55% 48.55% at 50.04% 51.45%, #16253B 0%, #0B121E 100%)'
              : 'radial-gradient(96.81% 77.58% at 50.04% 50%, rgba(247, 247, 247, 0.50) 8.84%, rgba(180, 193, 219, 0.50) 94.89%)',
        }}
      >
        {isFilterOpen ? <Filters /> : null}
        <Suspense
          fallback={
            <div className="flex flex-1 h-full w-full items-center justify-center">
              <CircleSpinner size="lg" />
            </div>
          }
        >
          <ThreatGraphComponent
            onNodeClick={(model: ThreatGraphNodeModelConfig | undefined) => {
              if (!model) return;
              if (model.nonInteractive) return;
              const { label, nodeType, nodes, cloudId } = model;
              if (nodeType) setModalData({ label, nodeType, nodes, cloudId });
            }}
          />
        </Suspense>
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
          cloudId={modalData.cloudId}
        />
      )}
    </div>
  );
};

const ThreatGraphHeader = ({
  setIsFilterOpen,
}: {
  setIsFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [searchParams] = useSearchParams();
  return (
    <BreadcrumbWrapper>
      <div className="px-4 flex items-center gap-[6px] text-text-input-value">
        <div className="h-4 w-4 shrink-0">
          <ThreatGraphIcon />
        </div>
        <div className="text-p1a">ThreatGraph</div>
      </div>
      <Button
        variant="flat"
        size="md"
        className="ml-auto mr-4"
        startIcon={<FilterIcon />}
        type="button"
        onClick={() => {
          setIsFilterOpen((state) => {
            return !state;
          });
        }}
        endIcon={
          getAppliedFiltersCount(searchParams) > 0 ? (
            <Badge
              label={String(getAppliedFiltersCount(searchParams))}
              variant="filled"
              size="small"
              color="blue"
            />
          ) : null
        }
      >
        Filter
      </Button>
    </BreadcrumbWrapper>
  );
};

const THREAT_TYPES = [
  { label: 'Vulnerability', value: GraphThreatFiltersTypeEnum.Vulnerability },
  { label: 'Secret', value: GraphThreatFiltersTypeEnum.Secret },
  { label: 'Malware', value: GraphThreatFiltersTypeEnum.Malware },
  { label: 'Posture', value: GraphThreatFiltersTypeEnum.Compliance },
  { label: 'Cloud Posture', value: GraphThreatFiltersTypeEnum.CloudCompliance },
];

const THREAT_GRAPH_SCOPE = [{ label: 'Show cloud resources only', value: 'true' }];

const FILTER_SEARCHPARAMS: Record<
  string,
  {
    label: string;
    possibleValues?: Array<{ label: string; value: string }>;
  }
> = {
  type: { label: 'Threat', possibleValues: THREAT_TYPES },
  cloud_resource_only: { label: 'Scope', possibleValues: THREAT_GRAPH_SCOPE },
  aws_account_ids: { label: 'AWS account' },
  gcp_account_ids: { label: 'GCP account' },
  azure_account_ids: { label: 'Azure account' },
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};

const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [threatTypeSearchText, setThreatTypeSearchText] = useState('');
  const [scopeSearchText, setScopeSearchText] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);

  return (
    <FilterWrapper className="mt-[6px] mx-4 pt-4 px-4 pb-3">
      <div className="flex gap-2">
        <Combobox
          value={THREAT_TYPES.find((threatType) => {
            return threatType.value === searchParams.get('type');
          })}
          nullable
          onQueryChange={(query) => {
            setThreatTypeSearchText(query);
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              if (value) {
                prev.set('type', value.value);
              } else {
                prev.delete('type');
              }
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['type'].label}
        >
          {THREAT_TYPES.filter((item) => {
            if (!threatTypeSearchText.length) return true;
            return item.label.toLowerCase().includes(threatTypeSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>
        <Combobox
          value={THREAT_GRAPH_SCOPE.find((scope) => {
            return scope.value === searchParams.get('cloud_resource_only');
          })}
          nullable
          onQueryChange={(query) => {
            setScopeSearchText(query);
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              if (value) {
                prev.set('cloud_resource_only', value.value);
              } else {
                prev.delete('cloud_resource_only');
              }
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['cloud_resource_only'].label}
        >
          {THREAT_GRAPH_SCOPE.filter((item) => {
            if (!scopeSearchText.length) return true;
            return item.label.toLowerCase().includes(scopeSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>
        <SearchableCloudAccountsList
          cloudProvider="aws"
          defaultSelectedAccounts={searchParams.getAll('aws_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('aws_account_ids');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('aws_account_ids');
              value.forEach((id) => {
                prev.append('aws_account_ids', id);
              });
              return prev;
            });
          }}
        />
        <SearchableCloudAccountsList
          cloudProvider="gcp"
          defaultSelectedAccounts={searchParams.getAll('gcp_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('gcp_account_ids');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('gcp_account_ids');
              value.forEach((id) => {
                prev.append('gcp_account_ids', id);
              });
              return prev;
            });
          }}
        />
        <SearchableCloudAccountsList
          cloudProvider="azure"
          defaultSelectedAccounts={searchParams.getAll('azure_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('azure_account_ids');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('azure_account_ids');
              value.forEach((id) => {
                prev.append('azure_account_ids', id);
              });
              return prev;
            });
          }}
        />
      </div>
      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 my-4 flex-wrap items-center">
          {Array.from(searchParams)
            .filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            })
            .map(([key, value]) => {
              const valueLabel =
                FILTER_SEARCHPARAMS[key].possibleValues?.find((v) => v.value === value)
                  ?.label ?? value;
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  onRemove={() => {
                    setSearchParams((prev) => {
                      const existingValues = prev.getAll(key);
                      prev.delete(key);
                      existingValues.forEach((existingValue) => {
                        if (existingValue !== value) prev.append(key, existingValue);
                      });
                      return prev;
                    });
                  }}
                  text={`${FILTER_SEARCHPARAMS[key].label}: ${valueLabel}`}
                />
              );
            })}
          <Button
            variant="flat"
            color="default"
            startIcon={<TimesIcon />}
            onClick={() => {
              setSearchParams((prev) => {
                Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                  prev.delete(key);
                });
                return prev;
              });
            }}
            size="sm"
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </FilterWrapper>
  );
};
export const module = {
  element: <ThreatGraph />,
};
