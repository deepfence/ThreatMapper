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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOffset, setSearcOffset] = useState(0);
  const [hostList, setHostList] = useState<HostsListType[]>([]);

  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);

  const { hosts, status: listHostStatus } = useGetHostsList({
    scanType,
    searchText: searchQuery,
    offset: searchOffset,
  });

  useEffect(() => {
    if (hosts.length > 0) {
      setHostList((_hosts) => [..._hosts, ...hosts]);
    }
  }, [hosts]);

  // clear list when user search for new query
  useEffect(() => {
    setHostList([]);
    setSearcOffset(0);
  }, [searchQuery]);

  const searchHost = debounce((query) => {
    setSearchQuery(query);
  }, 1000);

  const onEndReached = () => {
    if (hosts.length > 0) {
      setSearcOffset((offset) => offset + 15);
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
          return searchQuery;
        }}
        loading={listHostStatus !== 'idle'}
        onQueryChange={searchHost}
        onEndReached={onEndReached}
      >
        {hostList.map((host, index) => {
          return (
            <ComboboxOption key={`${host.nodeId}-${index}`} value={host.nodeId}>
              {host.hostName}
            </ComboboxOption>
          );
        })}
      </Combobox>
    </>
  );
};
