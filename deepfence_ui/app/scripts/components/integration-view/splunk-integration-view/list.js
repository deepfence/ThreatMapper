/* eslint-disable react/destructuring-assignment */
import React from 'react';
import IntegrationTableView from '../../common/integration-table-view/integration-table-view';
import AppLoader from '../../common/app-loader/app-loader';
import {
  requestIntegrationDelete,
  showModal,
  resetIntegrationStates,
} from '../../../actions/app-actions';
import {
  NO_INTEGRATION_FOUND_ALERT_MESSAGE
} from '../../../constants/visualization-config';

function getEmptyStateView() {
  return (
    <div className="empty-state-wrapper">
      { NO_INTEGRATION_FOUND_ALERT_MESSAGE.message }
    </div>
  );
}

function getTableEmptyState(data) {
  const emptyStateWrapper = {
    height: '400px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  return (
    <div style={emptyStateWrapper}>
      { (data === undefined) ? <AppLoader /> : getEmptyStateView() }
    </div>
  );
}

function isDataAvailable(data) {
  let result;
  if (data && data.length > 0) {
    result = true;
  } else {
    result = false;
  }
  return result;
}

class SplunkIntegrationList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.getIntegrationTableView = this.getIntegrationTableView.bind(this);
    this.deleteIntegration = this.deleteIntegration.bind(this);
    this.handleDeleteDialog = this.handleDeleteDialog.bind(this);
  }

  resetStates() {
    this.props.dispatch(resetIntegrationStates());
  }

  getIntegrationTableView() {
    const { splunkIntegrationList } = this.props;
    return (
      <IntegrationTableView
        recordCollection={splunkIntegrationList}
        onDeleteRequestCallback={record => this.handleDeleteDialog(record)}
      />
    );
  }

  deleteIntegration(record) {
    const params = {
      id: record.id,
      notification_type: record.notification_type,
    };
    return this.props.dispatch(requestIntegrationDelete(params));
  }

  handleDeleteDialog(record) {
    const params = {
      dialogTitle: 'Delete Integration?',
      dialogBody: 'Are you sure you want to delete the Splunk integration?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No, Keep',
      onConfirmButtonClick: () => this.deleteIntegration(record),
    };
    this.props.dispatch(showModal('DIALOG_MODAL', params));
    this.resetStates();
  }

  render() {
    const { splunkIntegrationList } = this.props;
    return (
      <div className="integration-list-section">
        { isDataAvailable(splunkIntegrationList)
          ? this.getIntegrationTableView()
          : getTableEmptyState(splunkIntegrationList) }
      </div>
    );
  }
}

export default SplunkIntegrationList;
