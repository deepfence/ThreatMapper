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
  const {history} = props;
  const [selectedRegistry, setSelectedRegistry] = useState({});
  const dispatch = useDispatch();

  const clearAction = () => dispatch(clearContainerImageRegistryAddFormAction);
  const saveAction = params => dispatch(saveRegistryCredentialAction(params));
  const listRegistryImagesAction = params =>
    dispatch(listRegistryImagesAction(params));
  const listRegistryCredentialsAction = params =>
    dispatch(listRegistryCredentialsAction(params));

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
    props.setModal();
    history.push('./onboard')
    // const promise = saveAction(params);
    // promise.then((response = {}) => {
    //   getRegistry();
    //   const { data } = response;
    //   if (data) {
    //     // The response from get Images is required
    //     // to calculate total images which will be
    //     // shown in credentials table
    //     getImages(data);
    //     console.log('======')
    //     // setSelectedRegistry({});
    //     history.push('./onboard')
    //   }
    // });
    return Promise.resolve({});
  };
  function renderModalContent() {
    const {
      hideModal, // from injectTrigger
    } = props;

    console.log('hideModal', hideModal)

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

  useEffect(() => {
    if (selectedRegistry.id) {
      console.log('----selectedRegistry', selectedRegistry)
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
      <RegistryList history={props.history} setModal={setModal}/>
    </OnboardModal>
  );
};
