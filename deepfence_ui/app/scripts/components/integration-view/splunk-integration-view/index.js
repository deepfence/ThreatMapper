import React from 'react';
import SplunkIntegrationListContainer from './list-container';
import SplunkIntegrationForm from './add-form';

const SplunkIntegrationView = () => (
  <div className="email-integration-view-wrapper">
    <SplunkIntegrationForm />
    <SplunkIntegrationListContainer />
  </div>
);

export default SplunkIntegrationView;
