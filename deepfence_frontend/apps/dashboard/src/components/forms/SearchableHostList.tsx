import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

export type SearchableHostListProps = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
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
};
const fieldName = 'hostFilter';
const PAGE_SIZE = 15;
const SearchableHost = ({
  scanType,
  onChange,
  onClearAll,
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
        searchText,
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
        return allPages.length * PAGE_SIZE;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * PAGE_SIZE;
      },
    });

  const searchHost = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <Combobox
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name={fieldName}
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Host' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedHosts.length > 0
            ? `${selectedHosts.length} selected`
            : displayValue
              ? displayValue
              : null
        }
        placeholder="Select host"
        multiple
        value={selectedHosts}
        onChange={(values) => {
          setSelectedHosts(values);
          onChange?.(values);
        }}
        onQueryChange={searchHost}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data?.pages
          .flatMap((page) => {
            return page.hosts;
          })
          .map((host, index) => {
            return (
              <ComboboxOption key={`${host.nodeId}-${index}`} value={host[valueKey]}>
                {host.nodeName}
              </ComboboxOption>
            );
          })}
      </Combobox>
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
          <Combobox
            name={fieldName}
            value={defaultSelectedHosts}
            label={isSelectVariantType ? 'Host' : undefined}
            triggerVariant={triggerVariant || 'button'}
            startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
            placeholder="Select host"
            multiple
            onQueryChange={() => {
              // no operation
            }}
            getDisplayValue={() => {
              return props.displayValue ? props.displayValue : 'Select host';
            }}
          />
        </>
      }
    >
      <SearchableHost {...props} />
    </Suspense>
  );
};
