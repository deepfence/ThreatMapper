import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import {
  ClustersListType,
  useGetClustersList,
} from '@/features/common/data-component/searchClustersApiLoader';

export const SearchableClusterList = ({
  onChange,
}: {
  onChange?: (value: string[]) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [clusterList, setClusterList] = useState<ClustersListType[]>([]);

  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);

  const { clusters, status: listClusterStatus } = useGetClustersList({
    searchText: searchQuery,
    offset: offset,
  });

  useEffect(() => {
    if (clusters.length > 0) {
      setClusterList((_clusters) => [..._clusters, ...clusters]);
    }
  }, [clusters]);

  const searchCluster = debounce((query) => {
    setSearchQuery(query);
  }, 1000);

  const onEndReached = () => {
    if (clusters.length > 0) {
      setOffset((offset) => offset + 15);
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
      {listClusterStatus !== 'idle' && clusterList.length === 0 ? (
        <CircleSpinner size="xs" />
      ) : (
        <>
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
            onQueryChange={searchCluster}
            onEndReached={onEndReached}
          >
            {clusterList.map((cluster, index) => {
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
      )}
    </>
  );
};
