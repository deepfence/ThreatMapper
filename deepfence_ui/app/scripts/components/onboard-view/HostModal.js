import React from 'react';
import { OnboardModal } from './OnboardModal';

export const HostModal = props => {
  const { open, setModal } = props;

  return (
    <OnboardModal isOpen={open} setModal={setModal}>
      Hello Host
    </OnboardModal>
  );
};
