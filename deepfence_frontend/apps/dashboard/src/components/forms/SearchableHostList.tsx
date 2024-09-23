import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  CircleSpinner,
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerButton,
  ComboboxV2TriggerInput,
} from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { useDebouncedValue } from '@/utils/useDebouncedValue';

export interface SearchableHostListProps {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  defaultSelectedHosts?: string[];
  valueKey?: 'nodeId' | 'hostName' | 'nodeName';
  active?: boolean;
  agentRunning?: boolean;
  showOnlyKubernetesHosts?: boolean;
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
  isScannedForVulnerabilities?: boolean;
  isScannedForSecrets?: boolean;
  isScannedForMalware?: boolean;
  displayValue?: string;
}
const fieldName = 'hostFilter';
const PAGE_SIZE = 15;
const SearchableHost = ({
  scanType,
  onChange,
  defaultSelectedHosts,
  valueKey = 'nodeId',
  active,
  agentRunning = true,
  showOnlyKubernetesHosts,
  triggerVariant,
  helperText,
  color,
  isScannedForVulnerabilities,
  isScannedForSecrets,
  isScannedForMalware,
  displayValue,
}: SearchableHostListProps) => {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebouncedValue(searchText, 500);

  const [selectedHosts, setSelectedHosts] = useState<string[]>(
    defaultSelectedHosts ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedHosts(defaultSelectedHosts ?? []);
  }, [defaultSelectedHosts]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.search.hosts({
        scanType,
        size: PAGE_SIZE,
        searchText: debouncedSearchText,
        active,
        agentRunning,
        showOnlyKubernetesHosts,
        isScannedForVulnerabilities,
        isScannedForSecrets,
        isScannedForMalware,
        order: {
          sortBy: 'host_name',
          descending: false,
        },
      }),
      keepPreviousData: true,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.hosts.length < PAGE_SIZE) return null;
        return allPages.length * PAGE_SIZE;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * PAGE_SIZE;
      },
    });

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <ComboboxV2Provider
        selectedValue={selectedHosts}
        setSelectedValue={(values) => {
          setSelectedHosts(values);
          onChange?.(values);
        }}
        value={searchText}
        setValue={setSearchText}
        defaultSelectedValue={defaultSelectedHosts ?? []}
        name={fieldName}
        loading={isFetchingNextPage}
      >
        {isSelectVariantType ? (
          <ComboboxV2TriggerInput
            getDisplayValue={() => {
              return selectedHosts.length > 0 ? `${selectedHosts.length} selected` : null;
            }}
            label="Host"
            placeholder="Select host"
            helperText={helperText}
            color={color}
          ></ComboboxV2TriggerInput>
        ) : (
          <ComboboxV2TriggerButton>
            {displayValue ? displayValue : 'Select host'}
          </ComboboxV2TriggerButton>
        )}
        <ComboboxV2Content
          width={isSelectVariantType ? 'anchor' : 'fixed'}
          clearButtonContent="Clear"
          onEndReached={onEndReached}
          searchPlaceholder="Search"
        >
          {data?.pages
            .flatMap((page) => {
              return page.hosts;
            })
            .map((host, index) => {
              return (
                <ComboboxV2Item key={`${host.nodeId}-${index}`} value={host[valueKey]}>
                  {host.nodeName}
                </ComboboxV2Item>
              );
            })}
        </ComboboxV2Content>
      </ComboboxV2Provider>
    </>
  );
};

export const SearchableHostList = (props: SearchableHostListProps) => {
  const { triggerVariant, defaultSelectedHosts = [] } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <>
          <ComboboxV2Provider
            defaultSelectedValue={defaultSelectedHosts}
            name={fieldName}
          >
            {isSelectVariantType ? (
              <ComboboxV2TriggerInput
                placeholder="Select host"
                label="Host"
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
                getDisplayValue={() => {
                  return props.displayValue;
                }}
              />
            ) : (
              <ComboboxV2TriggerButton
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
              >
                {props.displayValue ? props.displayValue : 'Select host'}
              </ComboboxV2TriggerButton>
            )}
          </ComboboxV2Provider>
        </>
      }
    >
      <SearchableHost {...props} />
    </Suspense>
  );
};
