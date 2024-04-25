import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

export type SearchableNamespaceListProps = {
  nodeType: 'pod' | 'container';
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedNamespaces?: string[];
  valueKey?: 'nodeId' | 'namespace';
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
};

const PAGE_SIZE = 15;
const SearchableNamespace = ({
  nodeType,
  onChange,
  onClearAll,
  defaultSelectedNamespaces: defaultSelectedNamespaces,
  triggerVariant,
  helperText,
  color,
}: SearchableNamespaceListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>(
    defaultSelectedNamespaces ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedNamespaces(defaultSelectedNamespaces ?? []);
  }, [defaultSelectedNamespaces]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } = (function () {
    if (nodeType === 'pod') {
      return useSuspenseInfiniteQuery({
        ...queries.common.searchPodsInfo({
          size: PAGE_SIZE,
          searchText,
          fieldName: 'kubernetes_namespace',
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
    return useSuspenseInfiniteQuery({
      ...queries.common.searchContainersInfo({
        size: PAGE_SIZE,
        searchText,
        fieldName: 'kubernetes_namespace',
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
  })();

  const searchNamespace = debounce((query: string) => {
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
        name="namespaceFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Namespace' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedNamespaces.length > 0
            ? `${selectedNamespaces.length} selected`
            : null
        }
        placeholder="Select namespace"
        multiple
        value={selectedNamespaces}
        onChange={(values) => {
          setSelectedNamespaces(values);
          onChange?.(values);
        }}
        onQueryChange={searchNamespace}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data?.pages
          .flatMap((page) => {
            return page.data;
          })
          .map((item, index) => {
            return (
              <ComboboxOption key={`${item}-${index}`} value={item}>
                {item}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableNamespaceList = (props: SearchableNamespaceListProps) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'Namespace' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Select namespace"
          multiple
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <SearchableNamespace {...props} />
    </Suspense>
  );
};
