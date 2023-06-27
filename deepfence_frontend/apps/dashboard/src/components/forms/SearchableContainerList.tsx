import { useInfiniteQuery } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

export type Props = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedContainers?: string[];
  valueKey?: 'nodeId' | 'hostName';
  active?: boolean;
};
const PAGE_SIZE = 15;
export const SearchableContainerList = ({
  scanType,
  onChange,
  onClearAll,
  defaultSelectedContainers,
  valueKey = 'nodeId',
  active,
}: Props) => {
  const [searchText, setSearchText] = useState('');

  const [selectedContainers, setSelectedContainers] = useState<string[]>(
    defaultSelectedContainers ?? [],
  );

  useEffect(() => {
    setSelectedContainers(defaultSelectedContainers ?? []);
  }, [defaultSelectedContainers]);

  const { data, isFetching, hasNextPage, fetchNextPage } = useInfiniteQuery({
    ...queries.search.containers({
      scanType,
      size: PAGE_SIZE,
      searchText,
      active,
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

  const searchContainer = debounce((query) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <input
        type="text"
        name="selectedContainerLength"
        hidden
        readOnly
        value={selectedContainers.length}
      />
      <Combobox
        startIcon={
          isFetching ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name="containerFilter"
        getDisplayValue={() => 'Container'}
        multiple
        value={selectedContainers}
        onChange={(values) => {
          setSelectedContainers(values);
          onChange?.(values);
        }}
        onQueryChange={searchContainer}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
      >
        {data?.pages
          .flatMap((page) => {
            return page.containers;
          })
          .map((container, index) => {
            return (
              <ComboboxOption
                key={`${container.nodeId}-${index}`}
                value={container[valueKey]}
              >
                {container.hostName}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};
