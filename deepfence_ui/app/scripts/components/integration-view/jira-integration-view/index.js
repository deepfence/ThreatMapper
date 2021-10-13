import React from 'react';
import JiraIntegrationListContainer from './list-container';
import JiraIntegrationForm from './add-form';

class JiraIntegrationView extends React.PureComponent {
  render() {
    return (
      <div className="email-integration-view-wrapper">
        <JiraIntegrationForm />
        <JiraIntegrationListContainer />
      </div>
    );
  }
}

export default JiraIntegrationView;
