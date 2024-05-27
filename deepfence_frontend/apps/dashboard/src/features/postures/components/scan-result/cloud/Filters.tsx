import { capitalize } from 'lodash-es';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button, Combobox, ComboboxOption } from 'ui-components';

import { FilterBadge } from '@/components/filters/FilterBadge';
import { TimesIcon } from '@/components/icons/common/Times';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { useGetCloudFilters } from '@/features/common/data-component/searchCloudFiltersApiLoader';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { SearchableControl } from '@/features/postures/components/scan-result/SearchableControl';
import { ComplianceScanNodeTypeEnum } from '@/types/common';

// #region filters
export const FILTER_SEARCHPARAMS: Record<string, string> = {
  visibility: 'Masked/Unmasked',
  status: 'Status',
  benchmarkType: 'Benchmark',
  services: 'Service',
  resources: 'Resource',
  controlId: 'Control',
};
export const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
export const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [maskedQuery, setMaskedQuery] = useState('');
  const [statusQuery, setStatusQuery] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);
  const [benchmarkQuery, setBenchmarkQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');

  const params = useParams() as {
    nodeType: ComplianceScanNodeTypeEnum;
    scanId: string;
  };

  const isGroupedView = searchParams.get('groupByControls') === 'true';

  if (!params.scanId) {
    console.warn('No scan id found');
  }
  const {
    status,
    filters: { services, statuses },
  } = useGetCloudFilters(params.scanId);

  const benchmarks = complianceType[params.nodeType];

  return (
    <FilterWrapper>
      <div className="flex gap-2">
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['visibility']}
          multiple
          value={searchParams.getAll('visibility')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('visibility');
              values.forEach((value) => {
                prev.append('visibility', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setMaskedQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('visibility');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {['masked', 'unmasked']
            .filter((item) => {
              if (!maskedQuery.length) return true;
              return item.toLowerCase().includes(maskedQuery.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['status']}
          multiple
          value={searchParams.getAll('status')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('status');
              values.forEach((value) => {
                prev.append('status', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setStatusQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('status');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {statuses
            .filter((item) => {
              if (!statusQuery.length) return true;
              return item.toLowerCase().includes(statusQuery.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>
        {!isGroupedView && (
          <Combobox
            getDisplayValue={() => FILTER_SEARCHPARAMS['benchmarkType']}
            multiple
            value={searchParams.getAll('benchmarkType')}
            onChange={(values) => {
              setSearchParams((prev) => {
                prev.delete('benchmarkType');
                values.forEach((value) => {
                  prev.append('benchmarkType', value);
                });
                prev.delete('page');
                return prev;
              });
            }}
            onQueryChange={(query) => {
              setBenchmarkQuery(query);
            }}
            clearAllElement="Clear"
            onClearAll={() => {
              setSearchParams((prev) => {
                prev.delete('benchmarkType');
                prev.delete('page');
                return prev;
              });
            }}
          >
            {benchmarks
              .filter((item) => {
                if (!benchmarkQuery.length) return true;
                return item.toLowerCase().includes(benchmarkQuery.toLowerCase());
              })
              .map((item) => {
                return (
                  <ComboboxOption key={item} value={item}>
                    {item}
                  </ComboboxOption>
                );
              })}
          </Combobox>
        )}

        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['services']}
          multiple
          loading={status === 'loading'}
          value={searchParams.getAll('services')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('services');
              values.forEach((value) => {
                prev.append('services', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setServiceQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('services');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {services
            .filter((item) => {
              if (!serviceQuery.length) return true;
              return item.toLowerCase().includes(serviceQuery.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {item}
                </ComboboxOption>
              );
            })}
        </Combobox>
        {!isGroupedView && (
          <SearchableControl
            scanId={params.scanId}
            defaultSelectedControl={searchParams.getAll('controlId')}
            onChange={(values) => {
              setSearchParams((prev) => {
                prev.delete('controlId');
                values.forEach((value) => {
                  prev.append('controlId', value);
                });
                prev.delete('page');
                return prev;
              });
            }}
            onClearAll={() => {
              setSearchParams((prev) => {
                prev.delete('controlId');
                prev.delete('page');
                return prev;
              });
            }}
          />
        )}
      </div>

      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {Array.from(searchParams)
            .filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            })
            .map(([key, value]) => {
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
                      prev.delete('page');
                      return prev;
                    });
                  }}
                  text={`${FILTER_SEARCHPARAMS[key]}: ${value}`}
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
                prev.delete('page');
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
// #endregion
