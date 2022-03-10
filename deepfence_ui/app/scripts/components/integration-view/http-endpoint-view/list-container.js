import React from 'react';
import { useSelector } from 'react-redux';
import HTTPEndpointList from './list';

const HTTPEndpointListContainer = props => {
  const httpEndpointList = useSelector(state =>
    state.get('availableHTTPEndpoints')
  );

  return <HTTPEndpointList {...props} httpEndpointList={httpEndpointList} />;
};

const connectedHTTPEndpointListContainer = HTTPEndpointListContainer;

export default connectedHTTPEndpointListContainer;
