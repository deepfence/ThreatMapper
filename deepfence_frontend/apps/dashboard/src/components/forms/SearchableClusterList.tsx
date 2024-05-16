import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
const fieldName = 'clusterFilter';
const PAGE_SIZE = 15;
type SearchableClusterListProps = {
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedClusters?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  agentRunning?: boolean;
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
  displayValue?: string;
};

const SearchableCluster = ({
  onChange,
  onClearAll,
  defaultSelectedClusters,
  valueKey = 'nodeId',
  active,
  agentRunning = true,
  triggerVariant,
  helperText,
  color,
  displayValue,
}: SearchableClusterListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedClusters, setSelectedClusters] = useState<string[]>(
    defaultSelectedClusters ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedClusters(defaultSelectedClusters ?? []);
  }, [defaultSelectedClusters]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.search.clusters({
        size: PAGE_SIZE,
        searchText,
        active,
        agentRunning,
        order: {
          sortBy: 'node_name',
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

  const searchCluster = debounce((query) => {
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
        label={isSelectVariantType ? 'Cluster' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedClusters.length > 0
            ? `${selectedClusters.length} selected`
            : displayValue
              ? displayValue
              : null
        }
        placeholder="Select cluster"
        multiple
        value={selectedClusters}
        onChange={(values) => {
          setSelectedClusters(values);
          onChange?.(values);
        }}
        onQueryChange={searchCluster}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data?.pages
          .flatMap((page) => {
            return page.clusters;
          })
          .map((cluster, index) => {
            return (
              <ComboboxOption
                key={`${cluster.nodeId}-${index}`}
                value={cluster[valueKey]}
              >
                {cluster.nodeName}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableClusterList = (props: SearchableClusterListProps) => {
  const { triggerVariant, defaultSelectedClusters = [] } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <>
          <Combobox
            name={fieldName}
            value={defaultSelectedClusters}
            label={isSelectVariantType ? 'Cluster' : undefined}
            triggerVariant={triggerVariant || 'button'}
            startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
            placeholder="Select cluster"
            multiple
            onQueryChange={() => {
              // no operation
            }}
            getDisplayValue={() => {
              return props.displayValue ? props.displayValue : 'Select cluster';
            }}
          />
        </>
      }
    >
      <SearchableCluster {...props} />
    </Suspense>
  );
};
