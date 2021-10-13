import React from 'react';
import { connect } from 'react-redux';
import JiraIntegrationList from './list';

class JiraIntegrationListContainer extends React.PureComponent {
  render() {
    const { httpEndpointList } = this.props;

    return (
      <JiraIntegrationList
        {...this.props}
        httpEndpointList={httpEndpointList}
      />
    );
  }
}

function mapStateToProps(state) {
  return {
    httpEndpointList: state.get('availableJiraIntegrations'),
  };
}

const connectedJiraIntegrationListContainer = connect(mapStateToProps)(
  JiraIntegrationListContainer
);

export default connectedJiraIntegrationListContainer;
