import React from 'react';
import GoogleChronicleListContainer from './list-container';
import GoogleChronicleForm from './add-form';

const GoogleChronicleView = () => (
    <div className="email-integration-view-wrapper">
      <GoogleChronicleForm />
      <GoogleChronicleListContainer />
    </div>
  )

export default GoogleChronicleView;
