import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

import {
  SearchClustersLoaderDataType,
  useGetClustersList,
} from '@/features/common/data-component/searchClustersApiLoader';
const PAGE_SIZE = 15;
export const SearchableClusterList = ({
  onChange,
  defaultSelectedClusters,
  reset,
}: {
  onChange?: (value: string[]) => void;
  defaultSelectedClusters?: string[];
  reset?: boolean;
}) => {
  const [searchState, setSearchState] = useState<{
    searchText: string;
    size: number;
    clustersList: SearchClustersLoaderDataType['clusters'];
    hasNext: boolean;
  }>({
    searchText: '',
    size: PAGE_SIZE,
    clustersList: [],
    hasNext: false,
  });

  const [selectedClusters, setSelectedClusters] = useState<string[]>(
    defaultSelectedClusters ?? [],
  );

  const { clusters, hasNext } = useGetClustersList({
    searchText: searchState.searchText,
    size: searchState.size,
  });

  useEffect(() => {
    setSelectedClusters(defaultSelectedClusters ?? []);
  }, [defaultSelectedClusters]);

  useEffect(() => {
    if (reset) {
      setSearchState({
        searchText: '',
        size: PAGE_SIZE,
        clustersList: [],
        hasNext: false,
      });
      setSelectedClusters([]);
    }
  }, [reset]);

  useEffect(() => {
    if (clusters.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          clustersList: clusters,
          hasNext,
        };
      });
    }
  }, [clusters]);

  const searchCluster = debounce((query) => {
    setSearchState({
      searchText: query,
      size: PAGE_SIZE,
      clustersList: [],
      hasNext: false,
    });
  }, 1000);

  const onEndReached = () => {
    if (clusters.length > 0) {
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
        name="selectedClusterLength"
        hidden
        readOnly
        value={selectedClusters.length}
      />
      <Combobox
        multiple
        sizing="sm"
        label="Select Cluster"
        placeholder="Select Cluster"
        name="clusterFilter"
        value={selectedClusters}
        onChange={(value) => {
          setSelectedClusters(value);
          onChange?.(value);
        }}
        getDisplayValue={() => {
          return searchState.searchText;
        }}
        onQueryChange={searchCluster}
        onEndReached={onEndReached}
      >
        {searchState.clustersList.map((cluster, index) => {
          return (
            <ComboboxOption
              key={`${cluster.clusterId}-${index}`}
              value={cluster.clusterId}
            >
              {cluster.clusterName}
            </ComboboxOption>
          );
        })}
      </Combobox>
    </>
  );
};
