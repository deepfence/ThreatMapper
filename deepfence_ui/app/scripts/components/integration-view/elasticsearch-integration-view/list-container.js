import React from 'react';
import { useSelector } from 'react-redux';
import ElasticsearchIntegrationList from './list';

const ElasticsearchIntegrationListContainer = props => {
  const elasticsearchIntegrationList = useSelector(state =>
    state.get('availableElasticsearchIntegrations')
  );

  return (
    <ElasticsearchIntegrationList
      {...props}
      elasticsearchIntegrationList={elasticsearchIntegrationList}
    />
  );
};
const connectedElasticsearchIntegrationListContainer =
  ElasticsearchIntegrationListContainer;

export default connectedElasticsearchIntegrationListContainer;
