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

class HTTPEndpointList extends React.PureComponent {
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
    const { httpEndpointList } = this.props;
    return (
      <IntegrationTableView
        recordCollection={httpEndpointList}
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
      dialogBody: 'Are you sure you want to delete this HTTP enpoint integration?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No, Keep',
      onConfirmButtonClick: () => this.deleteIntegration(record),
    };
    this.props.dispatch(showModal('DIALOG_MODAL', params));
    this.resetStates();
  }

  render() {
    const { httpEndpointList } = this.props;
    return (
      <div className="integration-list-section">
        { isDataAvailable(httpEndpointList)
          ? this.getIntegrationTableView()
          : getTableEmptyState(httpEndpointList) }
      </div>
    );
  }
}

export default HTTPEndpointList;
