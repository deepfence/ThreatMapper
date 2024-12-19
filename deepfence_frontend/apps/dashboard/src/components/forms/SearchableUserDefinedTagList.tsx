import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

export interface Props {
  resourceType: 'host' | 'container' | 'pod' | 'kubernetes_cluster';
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedTags?: string[] | null;
  triggerVariant?: 'select' | 'button';
}

const PAGE_SIZE = 10;

function useTagsQuery({
  resourceType,
  searchText,
}: {
  resourceType: Props['resourceType'];
  searchText: string;
}) {
  if (resourceType === 'host') {
    return useSuspenseInfiniteQuery({
      ...queries.common.searchHostFilters({
        fieldName: 'tags',
        size: PAGE_SIZE,
        searchText,
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
  } else if (resourceType === 'container') {
    return useSuspenseInfiniteQuery({
      ...queries.common.searchContainersInfo({
        fieldName: 'tags',
        size: PAGE_SIZE,
        searchText,
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
  } else if (resourceType === 'pod') {
    return useSuspenseInfiniteQuery({
      ...queries.common.searchPodsInfo({
        fieldName: 'tags',
        size: PAGE_SIZE,
        searchText,
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
  } else if (resourceType === 'kubernetes_cluster') {
    return useSuspenseInfiniteQuery({
      ...queries.common.searchKubernetesClusterFilters({
        fieldName: 'tags',
        size: PAGE_SIZE,
        searchText,
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
  }

  throw new Error('Unsupported resource type');
}

const SearchableTag = ({
  resourceType,
  onChange,
  onClearAll,
  defaultSelectedTags,
  triggerVariant,
}: Props) => {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    return defaultSelectedTags ?? [];
  });

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedTags(defaultSelectedTags ?? []);
  }, [defaultSelectedTags]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } = useTagsQuery({
    resourceType,
    searchText,
  });

  const searchTag = debounce((query) => {
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
        name="tagFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Select Custom Tags' : undefined}
        getDisplayValue={() => {
          if (isSelectVariantType) {
            return selectedTags.length > 0 ? `${selectedTags.length} selected` : null;
          }
          return null;
        }}
        placeholder="Custom tags"
        value={selectedTags}
        onChange={(value) => {
          setSelectedTags(value);
          onChange?.(value);
        }}
        multiple
        onQueryChange={searchTag}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
      >
        {data?.pages
          .flatMap((page) => {
            return page.data;
          })
          .map((tag, index) => {
            return (
              <ComboboxOption key={`${tag}-${index}`} value={tag}>
                <div>{tag}</div>
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableUserDefinedTagList = (props: Props) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'Select Custom Tags' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Custom tags"
          multiple
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <SearchableTag {...props} />
    </Suspense>
  );
};
