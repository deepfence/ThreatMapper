import React from 'react';
import { OnboardModal } from './OnboardModal';

export const RegistryModal = props => {
  const { open, setModal } = props;

  return (
    <OnboardModal isOpen={open} setModal={setModal}>
      Hello Registry
    </OnboardModal>
  );
};
