import React from 'react';
import { useSelector } from 'react-redux';
import JiraIntegrationList from './list';

const JiraIntegrationListContainer = props => {
  const httpEndpointList = useSelector(state =>
    state.get('availableJiraIntegrations')
  );

  return <JiraIntegrationList {...props} httpEndpointList={httpEndpointList} />;
};

const connectedJiraIntegrationListContainer = JiraIntegrationListContainer;

export default connectedJiraIntegrationListContainer;
