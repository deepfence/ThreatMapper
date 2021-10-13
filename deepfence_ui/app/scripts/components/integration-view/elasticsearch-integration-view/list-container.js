import React from 'react';
import { connect } from 'react-redux';
import ElasticsearchIntegrationList from './list';

class ElasticsearchIntegrationListContainer extends React.PureComponent {
  render() {
    const { elasticsearchIntegrationList } = this.props;

    return (
      <ElasticsearchIntegrationList
        {...this.props}
        elasticsearchIntegrationList={elasticsearchIntegrationList}
      />
    );
  }
}

function mapStateToProps(state) {
  return {
    elasticsearchIntegrationList: state.get('availableElasticsearchIntegrations'),
  };
}

const connectedElasticsearchIntegrationListContainer = connect(mapStateToProps)(
  ElasticsearchIntegrationListContainer
);

export default connectedElasticsearchIntegrationListContainer;
