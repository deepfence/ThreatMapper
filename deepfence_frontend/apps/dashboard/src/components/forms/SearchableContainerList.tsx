import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

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
  const [searchState, setSearchState] = useState<{
    searchText: string;
    offset: number;
    containersList: ContainersListType[];
  }>({
    searchText: '',
    offset: 0,
    containersList: [],
  });
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);

  const { containers } = useGetContainersList({
    scanType,
    searchText: searchState.searchText,
    offset: searchState.offset,
  });

  useEffect(() => {
    if (containers.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          containersList: [...prev.containersList, ...containers],
        };
      });
    }
  }, [containers]);

  const searchContainer = debounce((query) => {
    setSearchState({
      searchText: query,
      offset: 0,
      containersList: [],
    });
  }, 1000);

  const onEndReached = () => {
    if (containers.length > 0) {
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
        name="selectedContainerLength"
        hidden
        readOnly
        value={selectedContainers.length}
      />
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
        {searchState.containersList.map((container, index) => {
          return (
            <ComboboxOption key={`${container.nodeId}-${index}`} value={container.nodeId}>
              {container.nodeName}
            </ComboboxOption>
          );
        })}
      </Combobox>
    </>
  );
};
