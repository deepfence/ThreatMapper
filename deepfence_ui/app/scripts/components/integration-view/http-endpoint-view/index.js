import React from 'react';
import HTTPEndpointListContainer from './list-container';
import HTTPEndpointForm from './add-form';

class HTTPEndpointView extends React.PureComponent {
  render() {
    return (
      <div className="email-integration-view-wrapper">
        <HTTPEndpointForm />
        <HTTPEndpointListContainer />
      </div>
    );
  }
}

export default HTTPEndpointView;
