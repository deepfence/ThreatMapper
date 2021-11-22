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

const GoogleChronicleList = (props) => {
  const resetStates = () => {
    props.dispatch(resetIntegrationStates());
  }

  const getIntegrationTableView = () => {
    const { googleChronicleList } = props;
    return (
      <IntegrationTableView
        recordCollection={googleChronicleList}
        onDeleteRequestCallback={record => handleDeleteDialog(record)}
      />
    );
  }

  const deleteIntegration = (record) => {
    const params = {
      id: record.id,
      notification_type: record.notification_type,
    };
    return props.dispatch(requestIntegrationDelete(params));
  }

  const handleDeleteDialog = (record) => {
    const params = {
      dialogTitle: 'Delete Integration?',
      dialogBody: 'Are you sure you want to delete this Google Chronicle integration?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No, Keep',
      onConfirmButtonClick: () => deleteIntegration(record),
    };
    props.dispatch(showModal('DIALOG_MODAL', params));
    resetStates();
  }

  const { googleChronicleList } = props;
  return (
    <div className="integration-list-section">
      { isDataAvailable(googleChronicleList)
        ? getIntegrationTableView()
        : getTableEmptyState(googleChronicleList) }
    </div>
  )
}

export default GoogleChronicleList;
