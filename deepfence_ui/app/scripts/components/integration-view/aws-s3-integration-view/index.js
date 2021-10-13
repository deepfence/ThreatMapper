import React from 'react';
import AWSS3IntegrationListContainer from './list-container';
import AWSS3IntegrationForm from './add-form';

class AWSS3IntegrationView extends React.PureComponent {
  render() {
    return (
      <div className="email-integration-view-wrapper">
        <AWSS3IntegrationForm />
        <AWSS3IntegrationListContainer />
      </div>
    );
  }
}

export default AWSS3IntegrationView;
