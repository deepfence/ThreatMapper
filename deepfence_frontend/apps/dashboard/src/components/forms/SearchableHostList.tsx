import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

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
  const [hostSearchQuery, setSearchHostQuery] = useState('');
  const [hostSearchOffset, setSearchHostOffset] = useState(0);
  const [hostList, setHostList] = useState<HostsListType[]>([]);

  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);

  const { hosts, status: listHostStatus } = useGetHostsList({
    scanType,
    searchText: hostSearchQuery,
    offset: hostSearchOffset,
  });

  useEffect(() => {
    if (hosts.length > 0) {
      setHostList((_hosts) => [..._hosts, ...hosts]);
    }
  }, [hosts]);

  const searchHost = debounce((query) => {
    setSearchHostQuery(query);
  }, 1000);

  const onEndReached = () => {
    if (hosts.length > 0) {
      setSearchHostOffset((offset) => offset + 5);
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
      {listHostStatus !== 'idle' && hostList.length === 0 ? (
        <CircleSpinner size="xs" />
      ) : (
        <>
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
      )}
    </>
  );
};
