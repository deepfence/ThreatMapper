import React from 'react';
import { useSelector } from 'react-redux';
import AWSS3IntegrationList from './list';

const AWSS3IntegrationListContainer = props => {
  const awsS3IntegrationList = useSelector(state =>
    state.get('availableAWSS3Integrations')
  );
  return (
    <AWSS3IntegrationList
      {...props}
      awsS3IntegrationList={awsS3IntegrationList}
    />
  );
};

const connectedAWSS3IntegrationListContainer = AWSS3IntegrationListContainer;

export default connectedAWSS3IntegrationListContainer;
