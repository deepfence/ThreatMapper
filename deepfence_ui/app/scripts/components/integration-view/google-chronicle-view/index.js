import React from 'react';
import GoogleChronicleListContainer from './list-container';
import GoogleChronicleForm from './add-form';

class GoogleChronicleView extends React.PureComponent {
  render() {
    return (
      <div className="email-integration-view-wrapper">
        <GoogleChronicleForm />
        <GoogleChronicleListContainer />
      </div>
    );
  }
}

export default GoogleChronicleView;
