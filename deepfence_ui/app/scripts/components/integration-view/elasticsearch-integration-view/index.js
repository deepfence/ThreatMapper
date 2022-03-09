import React from 'react';
import ElasticsearchIntegrationListContainer from './list-container';
import ElasticsearchIntegrationForm from './add-form';

const ElasticsearchIntegrationView = () => (
  <div className="email-integration-view-wrapper">
    <ElasticsearchIntegrationForm />
    <ElasticsearchIntegrationListContainer />
  </div>
);

export default ElasticsearchIntegrationView;
