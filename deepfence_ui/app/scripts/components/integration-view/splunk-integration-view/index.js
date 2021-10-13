import React from 'react';
import SplunkIntegrationListContainer from './list-container';
import SplunkIntegrationForm from './add-form';

class SplunkIntegrationView extends React.PureComponent {
  render() {
    return (
      <div className="email-integration-view-wrapper">
        <SplunkIntegrationForm />
        <SplunkIntegrationListContainer />
      </div>
    );
  }
}

export default SplunkIntegrationView;
