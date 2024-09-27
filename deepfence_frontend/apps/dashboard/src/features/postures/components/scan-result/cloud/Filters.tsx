import { capitalize } from 'lodash-es';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerButton,
} from 'ui-components';

import { ModelBenchmarkType, ModelCloudComplianceStatusEnum } from '@/api/generated';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { TimesIcon } from '@/components/icons/common/Times';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { useGetCloudFilters } from '@/features/common/data-component/searchCloudFiltersApiLoader';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { usePageParams } from '@/features/postures/components/scan-result/cloud/hooks';
import { SearchableControl } from '@/features/postures/components/scan-result/SearchableControl';
import {
  getBenchmarkPrettyName,
  getMaskedUnmaskedPrettyName,
  getPostureStatusPrettyName,
} from '@/utils/enum';

export const FILTER_SEARCHPARAMS: Record<string, string> = {
  visibility: 'Masked/Unmasked',
  status: 'Status',
  benchmarkType: 'Benchmark',
  services: 'Service',
  resources: 'Resource',
  controlId: 'Control',
};
enum FILTER_SEARCHPARAMS_KEYS_ENUM {
  benchmarkType = 'benchmarkType',
}
const FILTER_SEARCHPARAMS_DYNAMIC_KEYS = [FILTER_SEARCHPARAMS_KEYS_ENUM.benchmarkType];

export const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};

const getPrettyNameForAppliedFilters = ({
  key,
  value,
}: {
  key: string;
  value: string;
}) => {
  switch (key) {
    case 'visibility':
      return getMaskedUnmaskedPrettyName(value);
    case 'status':
      return getPostureStatusPrettyName(value as ModelCloudComplianceStatusEnum);
    default:
      return value;
  }
};

export const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [maskedQuery, setMaskedQuery] = useState('');
  const [statusQuery, setStatusQuery] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);
  const [benchmarkQuery, setBenchmarkQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');

  const params = usePageParams();

  if (!params.scanId) {
    console.warn('No scan id found');
  }
  const {
    status,
    filters: { services, statuses },
  } = useGetCloudFilters(params.scanId);

  const benchmarks = complianceType[params.nodeType];

  const onFilterRemove = ({ key, value }: { key: string; value: string }) => {
    return () => {
      setSearchParams((prev) => {
        const existingValues = prev.getAll(key);
        prev.delete(key);
        existingValues.forEach((existingValue) => {
          if (existingValue !== value) prev.append(key, existingValue);
        });
        prev.delete('page');
        return prev;
      });
    };
  };
  return (
    <FilterWrapper>
      <div className="flex gap-2">
        <ComboboxV2Provider
          selectedValue={searchParams.getAll('visibility')}
          setSelectedValue={(values) => {
            setSearchParams((prev) => {
              prev.delete('visibility');
              values.forEach((value) => {
                prev.append('visibility', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          setValue={(query) => {
            setMaskedQuery(query);
          }}
        >
          <ComboboxV2TriggerButton>
            {FILTER_SEARCHPARAMS['visibility']}
          </ComboboxV2TriggerButton>
          <ComboboxV2Content width="fixed" clearButtonContent="Clear">
            {['masked', 'unmasked']
              .filter((item) => {
                if (!maskedQuery.length) return true;
                return item.toLowerCase().includes(maskedQuery.toLowerCase());
              })
              .map((item) => {
                return (
                  <ComboboxV2Item key={item} value={item}>
                    {capitalize(item)}
                  </ComboboxV2Item>
                );
              })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
        <ComboboxV2Provider
          selectedValue={searchParams.getAll('status')}
          setSelectedValue={(values) => {
            setSearchParams((prev) => {
              prev.delete('status');
              values.forEach((value) => {
                prev.append('status', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          setValue={(query) => {
            setStatusQuery(query);
          }}
        >
          <ComboboxV2TriggerButton>
            {FILTER_SEARCHPARAMS['status']}
          </ComboboxV2TriggerButton>
          <ComboboxV2Content width="fixed" clearButtonContent="Clear">
            {statuses
              .filter((item) => {
                if (!statusQuery.length) return true;
                return item.toLowerCase().includes(statusQuery.toLowerCase());
              })
              .map((item) => {
                return (
                  <ComboboxV2Item key={item} value={item}>
                    {capitalize(item)}
                  </ComboboxV2Item>
                );
              })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
        <ComboboxV2Provider
          selectedValue={searchParams.getAll('benchmarkType')}
          setSelectedValue={(values) => {
            setSearchParams((prev) => {
              prev.delete('benchmarkType');
              values.forEach((value) => {
                prev.append('benchmarkType', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          setValue={(query) => {
            setBenchmarkQuery(query);
          }}
        >
          <ComboboxV2TriggerButton>
            {FILTER_SEARCHPARAMS['benchmarkType']}
          </ComboboxV2TriggerButton>
          <ComboboxV2Content width="fixed" clearButtonContent="Clear">
            {benchmarks
              .filter((item) => {
                if (!benchmarkQuery.length) return true;
                return item.toLowerCase().includes(benchmarkQuery.toLowerCase());
              })
              .map((item) => {
                return (
                  <ComboboxV2Item key={item} value={item}>
                    {getBenchmarkPrettyName(item)}
                  </ComboboxV2Item>
                );
              })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
        <ComboboxV2Provider
          loading={status === 'loading'}
          selectedValue={searchParams.getAll('services')}
          setSelectedValue={(values) => {
            setSearchParams((prev) => {
              prev.delete('services');
              values.forEach((value) => {
                prev.append('services', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          setValue={(query) => {
            setServiceQuery(query);
          }}
        >
          <ComboboxV2TriggerButton>
            {FILTER_SEARCHPARAMS['services']}
          </ComboboxV2TriggerButton>
          <ComboboxV2Content width="fixed" clearButtonContent="Clear">
            {services
              .filter((item) => {
                if (!serviceQuery.length) return true;
                return item.toLowerCase().includes(serviceQuery.toLowerCase());
              })
              .map((item) => {
                return (
                  <ComboboxV2Item key={item} value={item}>
                    {item}
                  </ComboboxV2Item>
                );
              })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
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
      </div>

      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {(
            Array.from(searchParams).filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            }) as Array<[FILTER_SEARCHPARAMS_KEYS_ENUM, string]>
          ).map(([key, value]) => {
            if (FILTER_SEARCHPARAMS_DYNAMIC_KEYS.includes(key)) {
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  onRemove={onFilterRemove({ key, value })}
                  text={getBenchmarkPrettyName(value as ModelBenchmarkType)}
                  label={FILTER_SEARCHPARAMS[key]}
                />
              );
            }
            return (
              <FilterBadge
                key={`${key}-${value}`}
                onRemove={onFilterRemove({ key, value })}
                text={`${FILTER_SEARCHPARAMS[key]}: ${getPrettyNameForAppliedFilters({ key, value })}`}
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
