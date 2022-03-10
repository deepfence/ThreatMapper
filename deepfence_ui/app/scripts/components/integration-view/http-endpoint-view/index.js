import React from 'react';
import HTTPEndpointListContainer from './list-container';
import HTTPEndpointForm from './add-form';

const HTTPEndpointView = () => (
  <div className="email-integration-view-wrapper">
    <HTTPEndpointForm />
    <HTTPEndpointListContainer />s
  </div>
);

export default HTTPEndpointView;
