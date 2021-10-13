import React from 'react';
import { connect} from 'react-redux';
import { DialogModal } from '../dialog-modal/index';
import GenericModal from '../generic-modal/index';

const MODAL_COMPONENTS = {
  DIALOG_MODAL: DialogModal,
  GENERIC_MODAL: GenericModal,
};


class DFModal extends React.PureComponent {
  render() {
    const {modalType} = this.props;
    const ModalComponent = MODAL_COMPONENTS[modalType];
    if (!ModalComponent) {
      return null;
    }
    return (
      <ModalComponent
        {...this.props}
      />
    );
  }
}

export default connect(state => ({
  showModal: state.getIn(['modal', 'show']),
  modalType: state.getIn(['modal', 'modalType']),
  modalProps: state.getIn(['modal', 'modalProps'])
}))(DFModal);
