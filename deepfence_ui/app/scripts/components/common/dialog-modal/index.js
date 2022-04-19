/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { SubmissionError } from 'redux-form/immutable';
import ReactModal from 'react-modal';
import { useDispatch } from 'react-redux';
import ConfirmationBox from '../confirmation-box/index';
import { hideModal} from '../../../actions/app-actions';
import HorizontalLoader from '../app-loader/horizontal-dots-loader';

const modalStyles = {
  content: {
    backgroundColor: '#202020',
    width: '470px',
    margin: 'auto',
    height: '230px',
    padding: '30px 60px',
    border: 'none',
    borderRadius: '10px',
    display: 'flex',
  },
  overlay: {
    backgroundColor: 'rgba(16, 16, 16, 0.8)',
    zIndex: 100,
  }
};

export const DialogModal = ({modalProps, showModal }) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const handleHideModal = () => {
    dispatch(hideModal());
  };

  const handleConfirm = (values) => {
    const closeOnAction = modalProps.closeOnAction || true;
    const validateInputs = modalProps.validateInputs || (() => ({}));
    setLoading(true);
    const validation = validateInputs(values) || {};
    if (Object.keys(validation).length > 0) {
      setLoading(false);
      const async = () => new Promise(resolve => resolve());
      return async().then(() => {
        throw new SubmissionError(validation);
      });
    }
    return modalProps.onConfirmButtonClick(values).then(() => {
      setLoading(false);
      if (closeOnAction) {
        handleHideModal();
      }
    }, () => {
      setLoading(false);
      if (closeOnAction) {
        handleHideModal();
      }
    });
  };

  const modalStylesOverride = {
    content: {
      ...modalStyles.content,
      ...modalProps.contentStyles
    },
    overlay: {
      ...modalStyles.overlay,
      ...modalProps.overLayStyles
    }
  };
  const additionalInputs = modalProps.additionalInputs || [];
  // In case the dialog box has additional inputs, extract default
  // values from each input and pass it as initialValues to the
  // confirmationBox redux-form
  const formInitValues = additionalInputs.reduce((acc, inputObj) => {
    acc[inputObj.name] = inputObj.defaultValue;
    return acc;
  }, {});

  return (
    <div>
      <ReactModal
        isOpen={showModal}
        onRequestClose={handleHideModal}
        style={modalStylesOverride}
        ariaHideApp={false}
        >
        {loading && <HorizontalLoader />}
        <ConfirmationBox
          title={modalProps.dialogTitle}
          body={modalProps.dialogBody}
          confirmButtonText={modalProps.confirmButtonText}
          disableConfirmButton={loading}
          cancelButtonText={modalProps.cancelButtonText}
          onSubmit={handleConfirm}
          onCancelButtonClick={handleHideModal}
          additionalInputs={modalProps.additionalInputs}
          initialValues={formInitValues}
          />
        <i
          className="fa fa-close close-cb"
          onClick={handleHideModal}
          aria-hidden="true"
          />
      </ReactModal>
    </div>
  );
};
