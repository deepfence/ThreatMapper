import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

import {
  ClustersListType,
  useGetClustersList,
} from '@/features/common/data-component/searchClustersApiAction';

export const SearchableClusterList = ({
  onChange,
  defaultSelectedClusters,
}: {
  onChange?: (value: string[]) => void;
  defaultSelectedClusters?: string[];
}) => {
  const [searchState, setSearchState] = useState<{
    searchText: string;
    offset: number;
    clustersList: ClustersListType[];
  }>({
    searchText: '',
    offset: 0,
    clustersList: [],
  });

  const [selectedClusters, setSelectedClusters] = useState<string[]>(
    defaultSelectedClusters ?? [],
  );

  const { clusters, load } = useGetClustersList();

  useEffect(() => {
    load({
      searchText: searchState.searchText,
      offset: searchState.offset,
    });
  }, [searchState.searchText, searchState.offset]);

  useEffect(() => {
    if (clusters.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          clustersList: [...prev.clustersList, ...clusters],
        };
      });
    }
  }, [clusters]);

  const searchCluster = debounce((query) => {
    setSearchState({
      searchText: query,
      offset: 0,
      clustersList: [],
    });
  }, 1000);

  const onEndReached = () => {
    if (clusters.length > 0) {
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
        name="selectedClusterLength"
        hidden
        readOnly
        value={selectedClusters.length}
      />
      <Combobox
        multiple
        sizing="sm"
        label="Select Cluster"
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
