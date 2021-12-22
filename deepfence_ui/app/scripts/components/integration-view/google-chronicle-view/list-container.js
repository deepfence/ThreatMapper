import React from 'react';
import { useSelector } from 'react-redux';
import GoogleChronicleList from './list';

const GoogleChronicleListContainer = (props) => {
  const googleChronicleList = useSelector(state => state.get('availableGoogleChronicleIntegrations'))
  return (
    <GoogleChronicleList
      {...props}
      googleChronicleList={googleChronicleList}
    />
  );
}

export default GoogleChronicleListContainer;
