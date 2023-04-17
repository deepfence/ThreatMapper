import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import {
  ContainersListType,
  useGetContainersList,
} from '@/features/common/data-component/searchContainersApiLoader';
import { ScanTypeEnum } from '@/types/common';

export type Props = {
  scanType: ScanTypeEnum;
  onChange?: (value: string[]) => void;
};
export const SearchableContainerList = ({ scanType, onChange }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [containerList, setContainerList] = useState<ContainersListType[]>([]);

  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);

  const { containers, status: listContainerStatus } = useGetContainersList({
    scanType,
    searchText: searchQuery,
    offset: offset,
  });

  useEffect(() => {
    if (containers.length > 0) {
      setContainerList((_containers) => [..._containers, ...containers]);
    }
  }, [containers]);

  const searchContainer = debounce((query) => {
    setSearchQuery(query);
  }, 1000);

  const onEndReached = () => {
    if (containers.length > 0) {
      setOffset((offset) => offset + 15);
    }
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
      {listContainerStatus !== 'idle' && containerList.length === 0 ? (
        <CircleSpinner size="xs" />
      ) : (
        <>
          <Combobox
            multiple
            sizing="sm"
            label="Select container"
            name="containerFilter"
            value={selectedContainers}
            onChange={(value) => {
              setSelectedContainers(value);
              onChange?.(value);
            }}
            onQueryChange={searchContainer}
            onEndReached={onEndReached}
          >
            {containerList.map((container, index) => {
              return (
                <ComboboxOption
                  key={`${container.nodeId}-${index}`}
                  value={container.nodeId}
                >
                  {container.nodeName}
                </ComboboxOption>
              );
            })}
          </Combobox>
        </>
      )}
    </>
  );
};
