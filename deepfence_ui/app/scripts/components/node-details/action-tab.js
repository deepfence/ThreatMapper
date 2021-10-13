import React from 'react';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
import pollable from '../common/header-view/pollable';

class ActionTab extends React.PureComponent {
  constructor(props) {
    super(props);
    this.triggerModal = this.triggerModal.bind(this);
  }

  componentDidMount() {
    const {pollingFunction, registerPolling, startPolling } = this.props;
    if (pollingFunction) {
      registerPolling(pollingFunction);
      startPolling();
    }
  }

  componentWillUnmount() {
    const {stopPolling} = this.props;
    stopPolling();
  }

  triggerModal() {
    const {triggerModal, modalType, modalProps} = this.props;
    triggerModal(modalType, modalProps);
  }

  render() {
    const {displayName, infoSummary} = this.props;
    return (
      <div
        className="action-tab"
        onClick={this.triggerModal}
        aria-hidden="true"
      >
        <div
          className="headline"
        >
          {displayName}
        </div>
        <div className="info-summary">
          {' '}
          {infoSummary}
          {' '}
        </div>
      </div>
    );
  }
}

export default injectModalTrigger(pollable({
  pollingIntervalInSecs: 5,
  setExponentialBackOff: false, // setting to false as pollable funciton doesn't return promise
})(ActionTab));
