import React from 'react';
import JiraIntegrationListContainer from './list-container';
import JiraIntegrationForm from './add-form';

const JiraIntegrationView = () => (
  <div className="email-integration-view-wrapper">
    <JiraIntegrationForm />
    <JiraIntegrationListContainer />
  </div>
);

export default JiraIntegrationView;
