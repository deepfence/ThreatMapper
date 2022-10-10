import React from 'react';
import { OnboardModal } from './OnboardModal';
import ContainerImageRegistryCredentials from '../vulnerability-view/registry-scan/credential';

export const RegistryModal = props => {
  const { open, setModal } = props;
  return (
    <OnboardModal isOpen={open} setModal={setModal}>
      <ContainerImageRegistryCredentials match={props.match} />
    </OnboardModal>
  );
};
