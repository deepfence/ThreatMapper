import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { OnboardModal } from './OnboardModal';
import ContainerImageRegistryCredentials from '../vulnerability-view/registry-scan/credential';
import { registryCredentialsMenu } from '../vulnerability-view/registry-scan/registry-details';
import CredentialsForm from '../vulnerability-view/registry-scan/credentials-form';
import {
  clearContainerImageRegistryAddFormAction,
  saveRegistryCredentialAction,
  listRegistryImagesAction,
} from '../../actions';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
// import ecrLogo from '../../../images/ecr.svg';
// import azureLogo from '../../../images/azure.svg';
// import dockerLogo from '../../../images/docker.svg';
// import gcrLogo from '../../../images/gcr.svg';
// import gitlabLogo from '../../../images/gitlab.svg';
// import jfrogLogo from '../../../images/jfrog.svg';
// import harborLogo from '../../../images/harbor.svg';
// import redHatLogo from '../../../images/red-hat.svg';

const Title = styled.h6`
  font-weight: 20;
  color: #fff;
  font-size: 16px;
  padding-bottom: 1em;
`;

const RegistryWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5em;
  width: 100%;
  padding-right: 8px;
  margin-top: 3rem;
`;

const RegistryBox = styled.div`
  background-color: #222222;
  position: relative;
  padding: 22px 20px;
  border-radius: 4px;
`;
const RegistryList = injectModalTrigger(props => {
  const [selectedRegistry, setSelectedRegistry] = useState({});
  const dispatch = useDispatch();

  function getRegistry() {
    listRegistryCredentialsAction({
      registryType: selectedRegistry.id,
    });
  }

  function getImages(data) {
    const params = {
      registryId: data,
      registryType: selectedRegistry.id,
    };

    return listRegistryImagesAction(params);
  }

  const saveRegistryCredentials = valuesIm => {
    const values = valuesIm.toJS();
    if (values.non_secret.is_public === true) {
      values.non_secret.aws_region_name = '';
    }
    const params = {
      ...values,
      registry_type: selectedRegistry.id,
    };
    const promise = saveAction(params);
    promise.then((response = {}) => {
      getRegistry();
      const { data } = response;
      if (data) {
        // The response from get Images is required
        // to calculate total images which will be
        // shown in credentials table
        getImages(data);
      }
    });
    return promise;
  };
  function renderModalContent() {
    const {
      hideModal, // from injectTrigger
    } = selectedRegistry;

    return (
      <CredentialsForm
        credentialsFieldList={selectedRegistry.formFields}
        onSubmit={saveRegistryCredentials}
        hide={hideModal}
        registryType={selectedRegistry.id}
        initialValues={selectedRegistry.initialValues}
        instructions={selectedRegistry.instructions}
      />
    );
  }

  const clearAction = () => dispatch(clearContainerImageRegistryAddFormAction);
  const saveAction = () => dispatch(saveRegistryCredentialAction);
  const listRegistryImagesAction = () => dispatch(listRegistryImagesAction);
  const listRegistryCredentialsAction = () =>
    dispatch(listRegistryCredentialsAction);

  useEffect(() => {
    if (selectedRegistry.id) {
      const modalProps = {
        title: 'Save Registry Credentials',
        modalContent: renderModalContent,
        modalContentProps: {
          initialValues: selectedRegistry.initialValues,
        },
        contentStyles: {
          width: '500px',
        },
        onHide: () => {
          clearAction();
          setSelectedRegistry({});
        },
      };
      const { triggerModal } = props; // from injectTrigger
      triggerModal('GENERIC_MODAL', modalProps);
    }
  }, [selectedRegistry.id]);

  return (
    <>
      <Title>Image Registry Vulnerability Scan</Title>
      <RegistryWrapper>
        {registryCredentialsMenu.map(registryCredential => (
          <RegistryBox key={registryCredential.id}>
            <div className={registryCredential.logoClass}>
              <img src={registryCredential.logo} alt="logo" />
            </div>
            <button
              type="button"
              className="btn-configure"
              onClick={() => {
                setSelectedRegistry(registryCredential);
              }}
            >
              {registryCredential.displayName}
            </button>
          </RegistryBox>
        ))}
      </RegistryWrapper>
    </>
  );
});

export const RegistryModal = props => {
  const { open, setModal } = props;
  return (
    <OnboardModal isOpen={open} setModal={setModal}>
      <RegistryList />
    </OnboardModal>
  );
};
