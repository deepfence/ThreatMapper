import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

export type SearchablePodListProps = {
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedPods?: string[];
  valueKey?: 'nodeId' | 'podName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
};

const PAGE_SIZE = 15;
const SearchablePod = ({
  onChange,
  onClearAll,
  defaultSelectedPods,
  active,
  triggerVariant,
  helperText,
  color,
}: SearchablePodListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedPods, setSelectedPods] = useState<string[]>(defaultSelectedPods ?? []);

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedPods(defaultSelectedPods ?? []);
  }, [defaultSelectedPods]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.search.pods({
        size: PAGE_SIZE,
        searchText,
        active,
        order: {
          sortBy: 'pod_name',
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

  const searchPod = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <input
        type="text"
        name="selectedPodLength"
        hidden
        readOnly
        value={selectedPods.length}
      />
      <Combobox
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name="podFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Host' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedPods.length > 0
            ? `${selectedPods.length} selected`
            : null
        }
        placeholder="Select pod"
        multiple
        value={selectedPods}
        onChange={(values) => {
          setSelectedPods(values);
          onChange?.(values);
        }}
        onQueryChange={searchPod}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data?.pages
          .flatMap((page) => {
            return page.pods;
          })
          .map((pod, index) => {
            return (
              <ComboboxOption key={`${pod.nodeId}-${index}`} value={pod.podName}>
                {pod.podName}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchablePodList = (props: SearchablePodListProps) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'Pod' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Select pod"
          multiple
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <SearchablePod {...props} />
    </Suspense>
  );
};
