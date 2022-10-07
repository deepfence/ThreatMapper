/* eslint-disable arrow-body-style */
import React from 'react';
import ReactModal from 'react-modal';
import styled from 'styled-components';

const CloseButton = styled.button`
  all: unset;
  color: #fff;
  right: 10px;
  position: absolute;
  cursor: pointer;
`;

export const OnboardModal = ({ children, isOpen, setModal }) => (
  <ReactModal
    isOpen={isOpen}
    style={{
      content: {
        backgroundColor: '#141414',
        border: 'none',
        borderRadius: 0,
        top: '100px',
      },
      overlay: {
        backgroundColor: 'rgba(16, 16, 16, 0.8)',
      },
    }}
    onRequestClose={setModal}
    ariaHideApp={false}
  >
    <CloseButton onClick={setModal} type="button">
      <i className="fa fa-times" aria-hidden="true" />
    </CloseButton>
    {children}
  </ReactModal>
);
