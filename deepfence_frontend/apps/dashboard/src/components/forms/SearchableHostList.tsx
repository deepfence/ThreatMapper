import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

import {
  HostsListType,
  useGetHostsList,
} from '@/features/common/data-component/searchHostsApiLoader';
import { ScanTypeEnum } from '@/types/common';

export type SearchableHostListProps = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
};
export const SearchableHostList = ({ scanType, onChange }: SearchableHostListProps) => {
  const [searchState, setSearchState] = useState<{
    searchText: string;
    offset: number;
    hostsList: HostsListType[];
  }>({
    searchText: '',
    offset: 0,
    hostsList: [],
  });

  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);

  const { hosts, status: listHostStatus } = useGetHostsList({
    scanType,
    searchText: searchState.searchText,
    offset: searchState.offset,
  });

  useEffect(() => {
    if (hosts.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          hostsList: [...prev.hostsList, ...hosts],
        };
      });
    }
  }, [hosts]);

  const searchHost = debounce((query) => {
    setSearchState({
      searchText: query,
      offset: 0,
      hostsList: [],
    });
  }, 1000);

  const onEndReached = () => {
    if (hosts.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          offset: prev.offset + 15,
        };
      });
    }
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
            <ComboboxOption key={`${host.nodeId}-${index}`} value={host.nodeId}>
              {host.nodeName}
            </ComboboxOption>
          );
        })}
      </Combobox>
    </>
  );
};
