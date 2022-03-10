import React from 'react';
import { useSelector } from 'react-redux';
import SplunkIntegrationList from './list';

const SplunkIntegrationListContainer = props => {
  const splunkIntegrationList = useSelector(state =>
    state.get('availableSplunkIntegrations')
  );

  return (
    <SplunkIntegrationList
      {...props}
      splunkIntegrationList={splunkIntegrationList}
    />
  );
};

const connectedSplunkIntegrationListContainer = SplunkIntegrationListContainer;

export default connectedSplunkIntegrationListContainer;
