import React from 'react';
import ElasticsearchIntegrationListContainer from './list-container';
import ElasticsearchIntegrationForm from './add-form';

class ElasticsearchIntegrationView extends React.PureComponent {
  render() {
    return (
      <div className="email-integration-view-wrapper">
        <ElasticsearchIntegrationForm />
        <ElasticsearchIntegrationListContainer />
      </div>
    );
  }
}

export default ElasticsearchIntegrationView;
