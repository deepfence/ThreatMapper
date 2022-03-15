/* eslint-disable arrow-body-style */
import React from 'react';
import ReactModal from 'react-modal';

export const DetailModal = ({ children, isOpen, onRequestClose }) => (
  <ReactModal
    isOpen={isOpen}
    style={{
      content: {
        backgroundColor: '#141414',
        border: 'none',
        borderRadius: 0,
        bottom: 0,
        left: 0,
        right: 0,
        top: '100px',
        padding: 0,
      },
      overlay: {
        backgroundColor: 'rgba(16, 16, 16, 0.8)',
        left: '90px',
        zIndex: 100
      }
    }}
    onRequestClose={onRequestClose}
    onAfterClose={
      () => {
        document.body.style.overflow = 'unset';
      }
    }
    onAfterOpen={
      () => {
        document.body.style.overflow = 'hidden';
      }
    }
    ariaHideApp={false}
  >
    {children}
  </ReactModal>
)
