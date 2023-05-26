import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

import {
  SearchHostsLoaderDataType,
  useGetHostsList,
} from '@/features/common/data-component/searchHostsApiLoader';
import { ScanTypeEnum } from '@/types/common';

export type SearchableHostListProps = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  defaultSelectedHosts?: string[];
  reset?: boolean;
  valueKey?: 'nodeId' | 'hostName' | 'nodeName';
};

const PAGE_SIZE = 15;

export const SearchableHostList = ({
  scanType,
  onChange,
  defaultSelectedHosts,
  reset,
  valueKey = 'nodeId',
}: SearchableHostListProps) => {
  const [searchState, setSearchState] = useState<{
    searchText: string;
    size: number;
    hostsList: SearchHostsLoaderDataType['hosts'];
    hasNext: boolean;
  }>({
    searchText: '',
    size: PAGE_SIZE,
    hostsList: [],
    hasNext: false,
  });

  const [selectedHosts, setSelectedHosts] = useState<string[]>(
    defaultSelectedHosts ?? [],
  );

  useEffect(() => {
    setSelectedHosts(defaultSelectedHosts ?? []);
  }, [defaultSelectedHosts]);

  useEffect(() => {
    if (reset) {
      setSearchState({
        searchText: '',
        size: PAGE_SIZE,
        hostsList: [],
        hasNext: false,
      });
      setSelectedHosts([]);
    }
  }, [reset]);

  const {
    hosts,
    status: listHostStatus,
    hasNext,
  } = useGetHostsList({
    scanType,
    searchText: searchState.searchText,
    size: searchState.size,
  });

  useEffect(() => {
    if (hosts.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          hostsList: hosts,
          hasNext,
        };
      });
    }
  }, [hosts, hasNext]);

  const searchHost = debounce((query) => {
    setSearchState({
      searchText: query,
      size: PAGE_SIZE,
      hostsList: [],
      hasNext: false,
    });
  }, 1000);

  const onEndReached = () => {
    setSearchState((prev) => {
      if (prev.hasNext) {
        return {
          ...prev,
          size: prev.size + PAGE_SIZE,
        };
      }
      return prev;
    });
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
          return searchState.searchText;
        }}
        loading={listHostStatus !== 'idle'}
        onQueryChange={searchHost}
        onEndReached={onEndReached}
      >
        {searchState.hostsList.map((host, index) => {
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
