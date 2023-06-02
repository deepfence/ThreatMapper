import { useInfiniteQuery } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

export type SearchableHostListProps = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  defaultSelectedHosts?: string[];
  valueKey?: 'nodeId' | 'hostName' | 'nodeName';
};

const PAGE_SIZE = 15;
export const SearchableHostList = ({
  scanType,
  onChange,
  defaultSelectedHosts,
  valueKey = 'nodeId',
}: SearchableHostListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedHosts, setSelectedHosts] = useState<string[]>(
    defaultSelectedHosts ?? [],
  );

  useEffect(() => {
    setSelectedHosts(defaultSelectedHosts ?? []);
  }, [defaultSelectedHosts]);

  const { data, isFetching, hasNextPage, fetchNextPage } = useInfiniteQuery({
    ...queries.search.hosts({
      scanType,
      size: PAGE_SIZE,
      searchText,
    }),
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
      <input
        type="text"
        name="selectedHostLength"
        hidden
        readOnly
        value={selectedHosts.length}
      />
      <Combobox
        multiple
        sizing="sm"
        label="Select host"
        placeholder="Select host"
        name="hostFilter"
        value={selectedHosts}
        onChange={(value) => {
          setSelectedHosts(value);
          onChange?.(value);
        }}
        getDisplayValue={() => {
          return searchText;
        }}
        loading={isFetching}
        onQueryChange={searchHost}
        onEndReached={onEndReached}
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
