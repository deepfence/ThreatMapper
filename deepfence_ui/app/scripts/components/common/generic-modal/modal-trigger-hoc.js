import React from 'react';
import {connect} from 'react-redux';
import {showModal, hideModal} from '../../../actions/app-actions';

const injectModalTrigger = (WrappedComponent) => {
  class HOC extends React.PureComponent {
    constructor(props) {
      super(props);
      this.triggerModal = this.triggerModal.bind(this);
      this.hideModal = this.hideModal.bind(this);
    }

    triggerModal(modalType, modalProps) {
      const {dispatch} = this.props;
      return dispatch(showModal(modalType, modalProps));
    }

    hideModal() {
      const {dispatch} = this.props;
      return dispatch(hideModal());
    }

    render() {
      const {...rest} = this.props;
      return (
        <WrappedComponent
          triggerModal={this.triggerModal}
          hideModal={this.hideModal}
          {...rest}
        />
      );
    }
  }
  return connect()(HOC);
};

export default injectModalTrigger;
