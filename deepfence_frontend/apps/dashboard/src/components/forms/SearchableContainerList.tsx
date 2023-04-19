import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

import {
  SearchContainersLoaderDataType,
  useGetContainersList,
} from '@/features/common/data-component/searchContainersApiLoader';
import { ScanTypeEnum } from '@/types/common';

export type Props = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  defaultSelectedContainers?: string[];
  reset?: boolean;
};
const PAGE_SIZE = 15;
export const SearchableContainerList = ({
  scanType,
  onChange,
  defaultSelectedContainers,
  reset,
}: Props) => {
  const [searchState, setSearchState] = useState<{
    searchText: string;
    size: number;
    containersList: SearchContainersLoaderDataType['containers'];
    hasNext: boolean;
  }>({
    searchText: '',
    size: PAGE_SIZE,
    containersList: [],
    hasNext: false,
  });
  const [selectedContainers, setSelectedContainers] = useState<string[]>(
    defaultSelectedContainers ?? [],
  );

  const { containers, hasNext } = useGetContainersList({
    scanType,
    searchText: searchState.searchText,
    size: searchState.size,
  });

  useEffect(() => {
    setSelectedContainers(defaultSelectedContainers ?? []);
  }, [defaultSelectedContainers]);

  useEffect(() => {
    if (reset) {
      setSearchState({
        searchText: '',
        size: PAGE_SIZE,
        containersList: [],
        hasNext: false,
      });
      setSelectedContainers([]);
    }
  }, [reset]);

  useEffect(() => {
    if (containers.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          containersList: containers,
          hasNext,
        };
      });
    }
  }, [containers]);

  const searchContainer = debounce((query) => {
    setSearchState({
      searchText: query,
      size: PAGE_SIZE,
      containersList: [],
      hasNext: false,
    });
  }, 1000);

  const onEndReached = () => {
    if (containers.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          size: prev.size + PAGE_SIZE,
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
        placeholder="Select container"
        name="containerFilter"
        value={selectedContainers}
        onChange={(value) => {
          setSelectedContainers(value);
          onChange?.(value);
        }}
        getDisplayValue={() => {
          return searchState.searchText;
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
