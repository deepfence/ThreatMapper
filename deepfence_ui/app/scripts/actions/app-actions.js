/* eslint-disable import/named */
/* eslint-disable no-restricted-globals */
/* eslint-disable import/no-cycle */
import ActionTypes from '../constants/action-types';
import {
  disableDashboardAccess,
  enableDashboardAccess,
} from '../utils/router-utils';
import {
  getTopVulnerableContainerAndHosts,
  fetchNodeSpecificDetails,
  deleteVulnerabilities,
  fetchGeoMapData,
  login,
  logout,
  register,
  getUserProfile,
  getPasswordResetLink,
  verifyResetPassword,
  changePassword,
  inviteForSignUp,
  registerViaInvite,
  getEula,
  addMediaIntegration,
  deleteMediaIntegration,
  updateNotificationSeenStatus,
  notifyAlerts,
  getCveSeverityChartData,
  getSystemStatus,
  genericMaskDocs,
  resetAPIKey,
  getCVEScanStatus,
  searchDocs,
  getCVESeverityReport,
  getCVETypeReport,
  getCVEImageReport,
  unmaskDocs,
  maskDocs,
  deleteDocsById,
  searchDocsWrapper,
  getAllUsers,
  deleteUser,
  groupby,
  topAffectedNodesChart,
  kubernetesGetAllPods,
  kubernetesGetCNIPlugin,
  getNodeStatus,
  getDiagnosticLogs,
  getAgentLogs,
  startCVEBulk,
  addUserDefinedTags,
  deleteUserDefinedTags,
  getRunningNotification,
  startCVEScan,
  getNodeTags,
  vulnerabilityCSVDownload,
  listRegistryImages,
  scanRegistryImages,
  saveRegistryCredentials,
  listRegistryCredentials,
  deleteRegistryCredentials,
  getTopVulnerableActiveContainers,
  getTopVulnerableAttackPaths,
  getTopVulnerableActiveHosts,
  xlsxReportDownload,
  xlsxScheduleEmail,
  getPDFReport,
  getPdfDownloadStatus,
  downloadPdfReport,
  getReportFilterOptions,
  enumerateFilters,
  enumerateNodes,
  getScheduledTasks,
  updateScheduledTasks,
  triggerRegistryRefresh,
  userUpdate,
  deleteScans,
  getUserAuditLog,
  revertToDefault,
  getTopologyMetrics,
  getMailConfigurations,
  deleteMailConfiguration,
  addMailConfiguration,
  getGlobalSettings,
  addGlobalSettings,
  getTopAttackPathsForNode
} from '../utils/web-api-utils';

import { GRAPH_VIEW_MODE, TABLE_VIEW_MODE } from '../constants/naming';

//
// Metrics
//

export function setGraphView() {
  return (dispatch) => {
    dispatch({
      type: ActionTypes.SET_VIEW_MODE,
      viewMode: GRAPH_VIEW_MODE,
    });
  };
}

export function setTableView() {
  return (dispatch) => {
    dispatch({
      type: ActionTypes.SET_VIEW_MODE,
      viewMode: TABLE_VIEW_MODE,
    });
  };
}

export function receiveNodeDetails(details, requestTimestamp) {
  return {
    type: ActionTypes.RECEIVE_NODE_DETAILS,
    requestTimestamp,
    details,
  };
}

export function receivedAlerts(alertsCollection) {
  return (dispatch, getState) => {
    const state = getState();
    const isAlertMasked = state.get('isAlertMasked');
    dispatch({
      type: ActionTypes.RECEIVE_ALERTS,
      alertsCollection
    });
    if (isAlertMasked) {
      dispatch(unFocusMaskedAlert());
    }
  }
}


//
// New Actions
//

export function expandSideNavbar() {
  return {
    type: ActionTypes.EXPAND_SIDE_NAVIGATION,
  };
}

export function collapseSideNavbar() {
  return {
    type: ActionTypes.COLLAPSE_SIDE_NAVIGATION,
  };
}


export function receiveVulnerabilityStats(vulnerabilityStats) {
  return {
    type: ActionTypes.RECEIVE_VULNERABILITY_STATS,
    vulnerabilityStats,
  };
}

export function receiveAreaChartData(areaChartData) {
  return {
    type: ActionTypes.RECEIVE_AREA_CHART_DATA,
    areaChartData,
  };
}


export function selectRefreshInterval(data) {
  return {
    type: ActionTypes.SELECT_REFRESH_INTERVAL,
    data,
  };
}

export function setSearchQuery(searchQuery) {
  return dispatch => {
    dispatch({
      type: ActionTypes.SET_SEARCH_QUERY,
      searchQuery,
    });
    dispatch(toggleFiltersView());
  };
}

export function setSearchBarValue(searchQuery) {
  return {
    type: ActionTypes.SET_SEARCH_BAR_VALUE,
    searchQuery,
  };
}

// Vulnerabilty Management start
export function submitAlertsDeleteRequest(params) {
  return dispatch => {
    deleteVulnerabilities(dispatch, params);
  };
}

export function receiveVulnerabilityDeleteResponse(response) {
  if (response.success) {
    response.isSuccess = true;
    response.isError = false;
    response.alertsDeleteResponse = response.data.message;
  } else {
    response.isSuccess = false;
    response.isError = true;
    response.alertsDeleteResponse = response.error.message;
  }
  return {
    type: ActionTypes.RECEIVE_ALERT_DELETE_RESPONSE,
    response,
  };
}

// Vulnerabilty Management End

export function receiveDonutDetails(donutType, donutDetails) {
  let action;
  if (donutType === 'severity') {
    action = ActionTypes.RECEIVE_SEVERITY_DONUT_DETAILS;
  } else if (donutType === 'anomaly') {
    action = ActionTypes.RECEIVE_ANOMALY_DONUT_DETAILS;
  } else if (donutType === 'resource_type') {
    action = ActionTypes.RECEIVE_RESOURCE_DONUT_DETAILS;
  }
  return {
    type: action,
    donutDetails,
  };
}

export function resetDonutStoreStates() {
  return {
    type: ActionTypes.RESET_DONUT_STORE_STAETS,
  };
}

export function selectAlertHistoryBound(data) {
  return {
    type: ActionTypes.SELECT_ALERT_HISTORY_BOUND,
    data,
  };
}

export function openDonutDetailsModal() {
  return {
    type: ActionTypes.OPEN_DONUT_DETAILS_MODAL,
  };
}

export function closeDonutDetailsModal() {
  return {
    type: ActionTypes.CLOSE_DONUT_DETAILS_MODAL,
  };
}

export function savePrevFileList(payload) {
  return {
    type: ActionTypes.SAVE_PREV_FILE_LIST,
    payload,
  };
}

export function setActiveDonut(
  activeSector,
  activeDonut,
  activeNode,
  activeHost,
  kubeNamespace,
  activePod,
  activeTopologyId,
  destinationIp,
  containerId
) {
  return (dispatch, getState) => {
    const state = getState();
    const isDonutDetailsModalVisible = state.get('isDonutDetailsModalVisible');
    const days = state.get('alertPanelHistoryBound');
    if (isDonutDetailsModalVisible) {
      // To Do hardcoded value to be store in store or some other logic
      fetchNodeSpecificDetails(
        dispatch,
        activeSector,
        activeDonut,
        activeNode,
        activeHost,
        kubeNamespace,
        activePod,
        activeTopologyId,
        destinationIp,
        containerId,
        0,
        20,
        'asc',
        undefined,
        undefined,
        days.value.number,
        days.value.time_unit
      );
    } else {
      dispatch(openDonutDetailsModal());
    }
    dispatch(
      updateActiveDonut(
        activeSector,
        activeDonut,
        activeNode,
        activeHost,
        kubeNamespace,
        activePod,
        activeTopologyId,
        destinationIp,
        containerId
      )
    );
  };
}

export function toggleFiltersView() {
  return (dispatch, getState) => {
    const state = getState();
    const searchQueryArr = state.get('globalSearchQuery');
    dispatch({
      type: ActionTypes.TOGGLE_FILTER_VIEW,
      showFilters: searchQueryArr.length > 0,
    });
  };
}

// Action to update donut active sector
export function updateActiveDonut(
  activeSector,
  activeDonut,
  activeNode,
  activeHost,
  kubeNamespace,
  activePod,
  activeTopologyId,
  destinationIp,
  containerId
) {
  return {
    type: ActionTypes.SET_ACTIVE_SECTOR,
    activeDonut,
    activeSector,
    activeNode,
    activeHost,
    kubeNamespace,
    activePod,
    activeTopologyId,
    destinationIp,
    containerId,
  };
}

// Action to set active filters
export function setActiveFilters(activeFilter, activeOptions) {
  return {
    type: ActionTypes.SET_ACTIVE_FILTERS,
    activeFilter,
    activeOptions,
  };
}

export function receiveNodeSpecificDetails(nodeSpecificDetails) {
  return (dispatch, getState) => {
    const state = getState();
    const isAlertMasked = state.get('isAlertMasked');
    dispatch({
      type: ActionTypes.RECEIVE_NODE_SPECIFIC_DETAILS,
      nodeSpecificDetails,
    });
    if (isAlertMasked) {
      dispatch(unFocusMaskedAlert());
    }
  };
}


export function fetchTopologyMetrics() {
  return dispatch => getTopologyMetrics(dispatch);
}

export function receiveTopologyMetrics(response) {
  return {
    type: ActionTypes.GET_TOPOLOGY_METRICS,
    response,
  };
}

export function openJsonTableViewModal() {
  return {
    type: ActionTypes.OPEN_TABLE_JSON_MODAL,
  };
}

export function closeJsonTableViewModal() {
  return {
    type: ActionTypes.CLOSE_TABLE_JSON_MODAL,
  };
}

export function updateTableJSONModalView(data) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_TABLE_JSON_MODAL_VIEW,
      data,
    });
    dispatch(openJsonTableViewModal());
  };
}

export function focusMaskedAlert(
  sector,
  donut,
  activeNode,
  activeHost,
  activeTopologyId,
  destinationIp,
  containerIdArr,
  recordsFrom,
  recordsPerPage,
  sortOrder,
  activeFilter,
  activeOptions,
  number,
  timeUnit
) {
  return dispatch => {
    // Action dispatch for masked alert focus
    dispatch({
      type: ActionTypes.FOCUS_MASKED_ALERT_ROW,
    });
    // Fetching latest alerts on successfully alert masked after 2 seconds
    fetchNodeSpecificDetails(
      dispatch,
      sector,
      donut,
      activeNode,
      activeHost,
      activeTopologyId,
      destinationIp,
      containerIdArr,
      recordsFrom,
      recordsPerPage,
      sortOrder,
      activeFilter,
      activeOptions,
      number,
      timeUnit
    );
  };
}

export function focusMaskedAlertAction() {
  return dispatch =>
    dispatch({
      type: ActionTypes.FOCUS_MASKED_ALERT_ROW,
    });
}

export function unFocusMaskedAlert() {
  return {
    type: ActionTypes.UN_FOCUS_MASKED_ALERT_ROW,
  };
}

export function receivedThreatMetricDetails(response) {
  return {
    type: ActionTypes.RECEIVE_THREAT_METRIC_DETAILS,
    response,
  };
}

/* END :: SUNBURST CHART */

/* START :: GEO MAP */
export function getGeoMapData(params) {
  return dispatch => {
    fetchGeoMapData(dispatch, params);
  };
}

export function receiveGeoMapData(response) {
  return {
    type: ActionTypes.RECEIVE_GEO_MAP_DATA,
    response,
  };
}
/* END :: GEO MAP */

/* START :: AUTH MODULE */
export function authenticateUser(params) {
  return dispatch => {
    login(dispatch, params);
  };
}

export function receiveLoginResponse(response) {
  let action;
  if (response.success) {
    localStorage.setItem('authToken', response.data.access_token);
    localStorage.setItem('refreshToken', response.data.refresh_token);
    enableDashboardAccess();
    action = ActionTypes.LOGIN_SUCCESS;
  } else {
    action = ActionTypes.LOGIN_FAILED;
  }
  return {
    type: action,
    response,
  };
}

export function registerUser(params) {
  return dispatch => {
    register(dispatch, params);
  };
}

export function receiveRegisterResponse(response) {
  if (response.success) {
    localStorage.setItem('authToken', response.data.access_token);
    localStorage.setItem('refreshToken', response.data.refresh_token);
    enableDashboardAccess();
  } else {
    response.isError = true;
    response.message = response.error.message;
  }
  return {
    type: ActionTypes.RECEIVE_REGISTRATION_RESPONSE,
    response,
  };
}

export function registerUserViaInvite(params) {
  return dispatch => {
    registerViaInvite(dispatch, params);
  };
}

export function receiveRegisterViaInviteResponse(response) {
  if (response.success) {
    localStorage.setItem('authToken', response.data.access_token);
    localStorage.setItem('refreshToken', response.data.refresh_token);
    enableDashboardAccess();
  } else {
    response.isError = true;
    response.message = response.error.message;
  }
  return {
    type: ActionTypes.RECEIVE_SIGN_UP_VIA_INVITE_RESPONSE,
    response,
  };
}

export function logoutUser() {
  return dispatch => {
    logout(dispatch);
  };
}

export function receiveLogoutResponse() {
  localStorage.clear();
  disableDashboardAccess();
  return {
    type: ActionTypes.LOGOUT_SUCCESS,
  };
}

export function fetchUserProfile() {
  return dispatch => {
    getUserProfile(dispatch);
  };
}

export function receiveUserProfileResponse(response) {
  localStorage.setItem('dfApiKey', response.api_key);
  return {
    type: ActionTypes.RECEIVE_USER_PROFILE,
    response,
  };
}

export function requestPasswordResetLink(params) {
  return dispatch => {
    getPasswordResetLink(dispatch, params);
  };
}

export function receivePasswordResetLinkResponse(response) {
  if (response.success) {
    response.isSuccess = true;
    response.isError = false;
    response.message = response.data;
  } else {
    response.isSuccess = false;
    response.isError = true;
    response.message = response.error.message;
  }
  return {
    type: ActionTypes.PASSWORD_RESET_LINK_RESPONSE,
    response,
  };
}

export function requestPasswordReset(params) {
  return dispatch => {
    verifyResetPassword(dispatch, params);
  };
}

export function receiveVerifyPasswordResponse(response) {
  if (response.success) {
    response.isSuccess = true;
    response.isError = false;
    response.message = response.data;
  } else {
    response.isSuccess = false;
    response.isError = true;
    response.message = response.error.message;
  }
  return {
    type: ActionTypes.PASSWORD_RESET_LINK_RESPONSE,
    response,
  };
}

export function requestPasswordChange(params) {
  return dispatch => {
    changePassword(dispatch, params);
  };
}

export function receiveChangePasswordResponse(response) {
  if (response.success) {
    response.isSuccess = true;
    response.isError = false;
    response.message = response.data;
  } else {
    response.isSuccess = false;
    response.isError = true;
    response.message = response.error.message;
  }
  return {
    type: ActionTypes.RECEIVE_PASSWORD_CHANGE_RESPONSE,
    response,
  };
}

export function sendSignUpInvite(params) {
  return dispatch => {
    inviteForSignUp(dispatch, params);
  };
}

export function receiveSignUpInviteResponse(response, params) {
  if (response.success) {
    response.isSuccess = true;
    response.isError = false;
    if (params.action === 'get_invite_link') {
      response.message = `Invite URL: ${response.data.invite_url}, invite will expire after ${response.data?.invite_expiry_hours} hours.`;
    } else {
      response.message = response.data.message;
    }
  } else {
    response.isSuccess = false;
    response.isError = true;
    response.message = response.error.message;
  }
  return {
    type: ActionTypes.RECEIVE_SIGN_UP_INVITE_RESPONSE,
    response,
  };
}

export function resetAuthModuleStates() {
  return {
    type: ActionTypes.RECEIVE_AUTH_MODULE_STATES,
  };
}

/* END :: AUTH MODULE */

/* START :: EULA */
export function fetchEula() {
  return dispatch => {
    getEula(dispatch);
  };
}

export function receiveEulaResponse(response) {
  return {
    type: ActionTypes.RECEIVE_EULA_RESPONSE,
    response,
  };
}
/* END :: EULA */


/* START :: NOTIFICATION */

export function enableNotificationIcon() {
  return {
    type: ActionTypes.ENABLE_NOTIFICATION_ICON,
  };
}

export function disableNotificationIcon() {
  return {
    type: ActionTypes.DISABLE_NOTIFICATION_ICON,
  };
}

export function markNotificationAsSeen() {
  return dispatch => {
    updateNotificationSeenStatus(dispatch);
  };
}

/* END :: NOTIFICATION */

/* START :: INTEGRATION */
export function submitIntegrationRequest(params) {
  return dispatch => {
    addMediaIntegration(dispatch, params);
  };
}

export function receiveIntegrationAddResponse(response) {
  if (response.success) {
    response.isSuccess = true;
    response.isError = false;
    response.integrationAddResponse = response.data.message;
  } else {
    response.isSuccess = false;
    response.isError = true;
    response.integrationAddResponse = response.error.message;
  }
  return {
    type: ActionTypes.RECEIVE_INTEGRATION_ADD_RESPONSE,
    response,
  };
}

export function receiveIntegrations(response) {
  return {
    type: ActionTypes.RECEIVE_INTEGRATION_RESPONSE,
    response,
  };
}

export function requestIntegrationDelete(params) {
  return dispatch => deleteMediaIntegration(dispatch, params);
}

export function resetIntegrationStates() {
  return {
    type: ActionTypes.RESET_INTEGRATION_STATES,
  };
}

export function resetUserProfileStates() {
  return {
    type: ActionTypes.RESET_USER_MANAGEMENT_STATES,
  };
}

/* END :: INTEGRATION */

/* START :: MANUAL NOTIFICATION */
export function requestManualAlertNotification(params) {
  return dispatch => notifyAlerts(dispatch, params);
}

export function toaster(message) {
  return {
    type: ActionTypes.TOASTER_NOTIFICATION_SHOW,
    payload: message,
  };
}

export function receiveNotifyAlertsResponse(response) {
  // Action dispatch for notified alerts unfocus
  if (response.success) {
    return {
      type: ActionTypes.FOCUS_MASKED_ALERT_ROW,
      response,
    };
  }
  return {
    type: ActionTypes.TOASTER_NOTIFICATION_SHOW,
    payload: response.error.message,
  };
}

export function hideToaster() {
  return {
    type: ActionTypes.TOASTER_NOTIFICATION_HIDE,
  };
}
/* END :: MANUAL NOTIFICATION */

/* START :: CVE SEVERITY CHART */
export function fetchCveSeverityChartData(params) {
  return dispatch => {
    getCveSeverityChartData(dispatch, params);
  };
}

export function receiveCveSeverityChartData(response) {
  return {
    type: ActionTypes.RECEIVE_CVE_SEVERITY_CHART_DATA,
    response,
  };
}
/* END :: CVE SEVERITY CHART */

/* START :: SYSTEM STATUS */
export function fetchSystemStatus(params) {
  return dispatch => {
    getSystemStatus(dispatch, params);
  };
}

export function receiveSystemStatus(response) {
  return {
    type: ActionTypes.RECEIVE_SYSTEM_STATUS,
    response,
  };
}
/* END :: SYSTEM STATUS */

/* START :: CLEAR DASHBOARD */
export function receiveClearDashBoardResponse() {
  return {
    type: ActionTypes.RECEIVE_CLEAR_DASHBOARD_RESPONSE,
  };
}
/* END :: CLEAR DASHBOARD */

export function hideModal() {
  return {
    type: ActionTypes.HIDE_MODAL,
  };
}

export function showModal(modalType, modalProps) {
  return {
    type: ActionTypes.SHOW_MODAL,
    payload: {
      modalType,
      modalProps,
    },
  };
}

export function resetAPIKeyAction() {
  return dispatch => {
    dispatch({
      type: ActionTypes.RESET_API_KEY_REQUEST,
    });
    resetAPIKey().then(
      response => {
        localStorage.setItem('authToken', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);
        dispatch({
          type: ActionTypes.RESET_API_KEY_SUCCESS,
          payload: response,
        });
      },
      error => {
        dispatch({
          type: ActionTypes.RESET_API_KEY_FAILURE,
          payload: error,
        });
      }
    );
  };
}

export function setRowSelectionAction(name, selectedRowIndex) {
  return {
    type: ActionTypes.SET_ROW_SELECTION,
    payload: selectedRowIndex,
    input: name,
  };
}

export function resetSelectionAction(name) {
  return {
    type: ActionTypes.RESET_SELECTION,
    input: name,
  };
}

export function resetNodePolicyLogSelection() {
  return {
    type: ActionTypes.RESET_NODE_NETWORK_PROTECTION_POLICY_LOG_SELECTION,
  };
}

export function getCVEScanStatusAction(imageId) {
  return dispatch => {
    dispatch({
      type: ActionTypes.CVE_SCAN_STATUS_REQUEST,
      input: imageId,
    });

    return getCVEScanStatus(imageId).then(
      response => {
        dispatch({
          type: ActionTypes.CVE_SCAN_STATUS_SUCCESS,
          payload: response,
          input: imageId,
        });
      },
      error => {
        let payload = {};
        if (error.status >= 400 && status < 500) {
          payload = JSON.parse(error.response);
        } else {
          payload = {
            error: {
              message:
                'Sorry, Something went wrong while updating vulnerability status',
            },
          };
        }
        dispatch({
          type: ActionTypes.CVE_SCAN_STATUS_FAILURE,
          payload,
          input: imageId,
        });
      }
    );
  };
}

export function cveScanInterimStatusUpdateAction(imageId, data) {
  return dispatch => {
    dispatch({
      type: ActionTypes.CVE_SCAN_INTERIM_STATUS_UPDATE,
      payload: data,
      imageId,
    });
  };
}

function genericThunkAction(
  actionTypes,
  promiseGenerator,
  params,
  additionalParams
) {
  if (!actionTypes) {
    // TODO: raise exception
    return;
  }
  if (!Array.isArray(actionTypes) || actionTypes.length !== 3) {
    // TODO: raise exception
    return;
  }
  return dispatch => {
    params = { ...params, dispatch };

    dispatch({
      type: actionTypes[0],
      input: params,
    });

    const successHandler = response => {
      dispatch({
        type: actionTypes[1],
        input: params,
        payload: response,
      });
      return response;
    };

    const errorHandler = error => {
      dispatch({
        type: actionTypes[2],
        input: params,
        payload: error,
      });
      return error;
    };

    const notificationErrorHandler = error => {
      dispatch({
        type: actionTypes[3],
        input: params,
        payload: error,
      });
      return error;
    };

    return promiseGenerator(params, additionalParams).then(
      successHandler,
      errorHandler,
      notificationErrorHandler
    );
  };
}

export function getCVESeverityReportAction(params) {
  const actionTypes = [
    ActionTypes.CVE_SEVERITY_REPORT_REQUEST,
    ActionTypes.CVE_SEVERITY_REPORT_SUCCESS,
    ActionTypes.CVE_SEVERITY_REPORT_FAILURE,
  ];
  return genericThunkAction(actionTypes, getCVESeverityReport, params);
}

export function getCVETypeReportAction(params) {
  const actionTypes = [
    ActionTypes.CVE_TYPE_REPORT_REQUEST,
    ActionTypes.CVE_TYPE_REPORT_SUCCESS,
    ActionTypes.CVE_TYPE_REPORT_FAILURE,
  ];
  return genericThunkAction(actionTypes, getCVETypeReport, params);
}

export function getCVEImageReportAction(params) {
  const actionTypes = [
    ActionTypes.CVE_IMAGE_REPORT_REQUEST,
    ActionTypes.CVE_IMAGE_REPORT_SUCCESS,
    ActionTypes.CVE_IMAGE_REPORT_FAILURE,
  ];
  return genericThunkAction(actionTypes, getCVEImageReport, params);
}

export function getCVEForHostAction(
  hostname,
  {
    chainedSuccessAction,
    chainedSuccessActionProcessor,
    chainedFailureAction,
  } = {}
) {
  return dispatch => {
    dispatch({
      type: ActionTypes.CVE_FOR_HOST_REQUEST,
      input: hostname,
    });

    const params = {
      from: 0,
      size: 10000,
    };

    const filters = {
      host_name: hostname,
      masked: [false],
      type: ['cve'],
    };

    // TODO: move this to the caller
    const fields = [
      'cve_severity',
      '@timestamp',
      'doc_id',
      'cve_id',
      'cve_type',
      'cve_container_image',
      'cve_description',
      'host',
      'host_name',
      'cve_attack_vector',
      'cve_cvss_score',
    ];
    return searchDocs('cve', params, filters, fields).then(
      response => {
        dispatch({
          type: ActionTypes.CVE_FOR_HOST_SUCCESS,
          input: hostname,
          payload: response,
        });

        if (chainedSuccessAction) {
          let payload = response;
          if (chainedSuccessActionProcessor) {
            payload = chainedSuccessActionProcessor(response);
          }
          dispatch({
            type: chainedSuccessAction,
            payload,
          });
        }
      },
      error => {
        dispatch({
          type: ActionTypes.CVE_FOR_HOST_FAILURE,
          input: hostname,
          payload: error,
        });

        if (chainedFailureAction) {
          dispatch({
            type: chainedFailureAction,
            payload: error,
          });
        }
      }
    );
  };
}

export function maskDocsAction(params) {
  const actionTypes = [
    ActionTypes.MASK_DOCS_REQUEST,
    ActionTypes.MASK_DOCS_SUCCESS,
    ActionTypes.MASK_DOCS_FAILURE,
  ];
  return genericThunkAction(actionTypes, maskDocs, params);
}

export function unmaskDocsAction(params, additionalParams) {
  const actionTypes = [
    ActionTypes.UNMASK_DOCS_REQUEST,
    ActionTypes.UNMASK_DOCS_SUCCESS,
    ActionTypes.UNMASK_DOCS_FAILURE,
  ];
  return genericThunkAction(actionTypes, unmaskDocs, params, additionalParams);
}

export function deleteDocsByIdAction(params) {
  const actionTypes = [
    ActionTypes.DELETE_DOCS_BY_ID_REQUEST,
    ActionTypes.DELETE_DOCS_BY_ID_SUCCESS,
    ActionTypes.DELETE_DOCS_BY_ID_FAILURE,
  ];
  return genericThunkAction(actionTypes, deleteDocsById, params);
}

export function getAllUsersAction(params) {
  const actionTypes = [
    ActionTypes.GET_ALL_USERS_REQUEST,
    ActionTypes.GET_ALL_USERS_SUCCESS,
    ActionTypes.GET_ALL_USERS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getAllUsers, params);
}

export function deleteUserAction(params) {
  const actionTypes = [
    ActionTypes.DELETE_USER_REQUEST,
    ActionTypes.DELETE_USER_SUCCESS,
    ActionTypes.DELETE_USER_FAILURE,
  ];
  return genericThunkAction(actionTypes, deleteUser, params);
}

export function getTopAffectedNodesAction(params) {
  const actionTypes = [
    ActionTypes.TOP_AFFECTED_NODES_REQUEST,
    ActionTypes.TOP_AFFECTED_NODES_SUCCESS,
    ActionTypes.TOP_AFFECTED_NODES_FAILURE,
  ];
  return genericThunkAction(actionTypes, groupby, params);
}

export function topAffectedNodesChartAction(params) {
  const actionTypes = [
    ActionTypes.TOP_AFFECTED_NODES_CHART_REQUEST,
    ActionTypes.TOP_AFFECTED_NODES_CHART_SUCCESS,
    ActionTypes.TOP_AFFECTED_NODES_CHART_FAILURE,
  ];
  return genericThunkAction(actionTypes, topAffectedNodesChart, params);
}

export function getAllKubernetesPodsAction(params) {
  const actionTypes = [
    ActionTypes.GET_ALL_KUBERNETES_PODS_REQUEST,
    ActionTypes.GET_ALL_KUBERNETES_PODS_SUCCESS,
    ActionTypes.GET_ALL_KUBERNETES_PODS_FAILURE,
  ];
  return genericThunkAction(actionTypes, kubernetesGetAllPods, params);
}

export function getKubernetesCNIPluginAction(params) {
  const actionTypes = [
    ActionTypes.GET_KUBERNETES_CNI_PLUGIN_REQUEST,
    ActionTypes.GET_KUBERNETES_CNI_PLUGIN_SUCCESS,
    ActionTypes.GET_KUBERNETES_CNI_PLUGIN_FAILURE,
  ];
  return genericThunkAction(actionTypes, kubernetesGetCNIPlugin, params);
}

export function genericMaskDocsAction(params) {
  return (dispatch) => genericMaskDocs(dispatch, params)
}
export function doNotChangeComponent() {
  return {
    type: ActionTypes.NO_COMPONENT_CHANGE,
  };
}
export function getNodeStatusAction(params) {
  const actionTypes = [
    ActionTypes.GET_TOPOLOGY_CVE_STATUS_REQUEST,
    ActionTypes.GET_TOPOLOGY_CVE_STATUS_SUCCESS,
    ActionTypes.GET_TOPOLOGY_CVE_STATUS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getNodeStatus, params);
}

export function updateNodeMetaAction(params) {
  return {
    type: ActionTypes.UPDATE_NODES_META,
    payload: params,
  };
}

export function getDiagnosticLogsAction(params) {
  const actionTypes = [
    ActionTypes.GET_DIAGNOSTIC_LOGS_REQUEST,
    ActionTypes.GET_DIAGNOSTIC_LOGS_SUCCESS,
    ActionTypes.GET_DIAGNOSTIC_LOGS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getDiagnosticLogs, params);
}

export function getAgentLogsAction(params) {
  const actionTypes = [
    ActionTypes.GET_DIAGNOSTIC_LOGS_REQUEST,
    ActionTypes.GET_DIAGNOSTIC_LOGS_SUCCESS,
    ActionTypes.GET_DIAGNOSTIC_LOGS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getAgentLogs, params);
}

export function clearStateDiagnosticLogsAction() {
  return {
    type: ActionTypes.RESET_DIAGNOSTIC_LOGS_DOWNLOAD_STATE,
  };
}

export function startCVEBulkAction(params) {
  const actionTypes = [
    ActionTypes.START_CVE_BULK_REQUEST,
    ActionTypes.START_CVE_BULK_SUCCESS,
    ActionTypes.START_CVE_BULK_FAILURE,
  ];
  return genericThunkAction(actionTypes, startCVEBulk, params);
}

export function addUserDefinedTagsAction(params) {
  const actionTypes = [
    ActionTypes.ADD_USER_DEFINED_TAGS_REQUEST,
    ActionTypes.ADD_USER_DEFINED_TAGS_SUCCESS,
    ActionTypes.ADD_USER_DEFINED_TAGS_FAILURE,
  ];
  return genericThunkAction(actionTypes, addUserDefinedTags, params);
}

export function deleteUserDefinedTagsAction(params) {
  const actionTypes = [
    ActionTypes.DELETE_USER_DEFINED_TAGS_REQUEST,
    ActionTypes.DELETE_USER_DEFINED_TAGS_SUCCESS,
    ActionTypes.DELETE_USER_DEFINED_TAGS_FAILURE,
  ];
  return genericThunkAction(actionTypes, deleteUserDefinedTags, params);
}

export function clearUserDefinedTagsAction(params) {
  return {
    type: ActionTypes.CLEAR_USER_DEFINED_TAGS,
    input: params,
  };
}

export function getRunningNotificationAction(params) {
  const actionTypes = [
    ActionTypes.GET_RUNNING_NOTIFICATION_REQUEST,
    ActionTypes.GET_RUNNING_NOTIFICATION_SUCCESS,
    ActionTypes.GET_RUNNING_NOTIFICATION_FAILURE,
  ];
  return genericThunkAction(actionTypes, getRunningNotification, params);
}

export function startCVEScanAction(params) {
  const actionTypes = [
    ActionTypes.START_CVE_SCAN_REQUEST,
    ActionTypes.START_CVE_SCAN_SUCCESS,
    ActionTypes.START_CVE_SCAN_FAILURE,
  ];
  return genericThunkAction(actionTypes, startCVEScan, params);
}

export function getNodeTagsAction(params) {
  const actionTypes = [
    ActionTypes.GET_NODE_TAGS_REQUEST,
    ActionTypes.GET_NODE_TAGS_SUCCESS,
    ActionTypes.GET_NODE_TAGS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getNodeTags, params);
}

export function vulnerabilityCSVDownloadAction(params) {
  const actionTypes = [
    ActionTypes.VULNERABILITY_CSV_DOWNLOAD_REQUEST,
    ActionTypes.VULNERABILITY_CSV_DOWNLOAD_SUCCESS,
    ActionTypes.VULNERABILITY_CSV_DOWNLOAD_FAILURE,
  ];
  return genericThunkAction(actionTypes, vulnerabilityCSVDownload, params);
}

export function listRegistryImagesAction(params) {
  const actionTypes = [
    ActionTypes.LIST_REGISTRY_IMAGES_REQUEST,
    ActionTypes.LIST_REGISTRY_IMAGES_SUCCESS,
    ActionTypes.LIST_REGISTRY_IMAGES_FAILURE,
  ];
  return genericThunkAction(actionTypes, listRegistryImages, params);
}

export function scanRegistryImagesAction(params) {
  const actionTypes = [
    ActionTypes.SCAN_REGISTRY_IMAGES_REQUEST,
    ActionTypes.SCAN_REGISTRY_IMAGES_SUCCESS,
    ActionTypes.SCAN_REGISTRY_IMAGES_FAILURE,
  ];
  return genericThunkAction(actionTypes, scanRegistryImages, params);
}

export function saveRegistryCredentialAction(params) {
  const actionTypes = [
    ActionTypes.SAVE_CONTAINER_IMAGE_REGISTRY_REQUEST,
    ActionTypes.SAVE_CONTAINER_IMAGE_REGISTRY_SUCCESS,
    ActionTypes.SAVE_CONTAINER_IMAGE_REGISTRY_FAILURE,
  ];
  return genericThunkAction(actionTypes, saveRegistryCredentials, params);
}

export function clearContainerImageRegistryAddFormAction(params) {
  return {
    type: ActionTypes.CLEAR_CONTAINER_IMAGE_REGISTRY_ADD_FORM,
    input: params,
  };
}

export function clearScanContainerImageRegistryAction() {
  return {
    type: ActionTypes.CLEAR_SCAN_REGISTRY_IMAGES,
  };
}

export function listRegistryCredentialsAction(params) {
  const actionTypes = [
    ActionTypes.LIST_CONTAINER_IMAGE_REGISTRY_REQUEST,
    ActionTypes.LIST_CONTAINER_IMAGE_REGISTRY_SUCCESS,
    ActionTypes.LIST_CONTAINER_IMAGE_REGISTRY_FAILURE,
  ];
  return genericThunkAction(actionTypes, listRegistryCredentials, params);
}

export function deleteRegistryCredentialsAction(params) {
  const actionTypes = [
    ActionTypes.DELETE_CONTAINER_IMAGE_REGISTRY_REQUEST,
    ActionTypes.DELETE_CONTAINER_IMAGE_REGISTRY_SUCCESS,
    ActionTypes.DELETE_CONTAINER_IMAGE_REGISTRY_FAILURE,
  ];
  return genericThunkAction(actionTypes, deleteRegistryCredentials, params);
}

export function getTopVulnerableActiveContainersAction(params) {
  const actionTypes = [
    ActionTypes.GET_TOP_VULNERABLE_CONTAINERS_REQUEST,
    ActionTypes.GET_TOP_VULNERABLE_CONTAINERS_SUCCESS,
    ActionTypes.GET_TOP_VULNERABLE_CONTAINERS_FAILURE,
  ];
  return genericThunkAction(
    actionTypes,
    getTopVulnerableActiveContainers,
    params
  );
}

export function getTopVulnerableAttackPathsAction(params) {
  const actionTypes = [
    ActionTypes.GET_TOP_VULNERABLE_ATTACK_PATHS_REQUEST,
    ActionTypes.GET_TOP_VULNERABLE_ATTACK_PATHS_SUCCESS,
    ActionTypes.GET_TOP_VULNERABLE_ATTACK_PATHS_FAILURE,
  ];
  return genericThunkAction(
    actionTypes,
    getTopVulnerableAttackPaths,
    params
  );
}

export function getTopVulnerableActiveHostsAction(params) {
  const actionTypes = [
    ActionTypes.GET_TOP_VULNERABLE_HOSTS_REQUEST,
    ActionTypes.GET_TOP_VULNERABLE_HOSTS_SUCCESS,
    ActionTypes.GET_TOP_VULNERABLE_HOSTS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getTopVulnerableActiveHosts, params);
}

export function getNodeTopAttackPathsAction(params) {
  const actionTypes = [
    ActionTypes.GET_TOP_ATTACK_PATHS_PER_NODE_REQUEST,
    ActionTypes.GET_TOP_ATTACK_PATHS_PER_NODE_SUCCESS,
    ActionTypes.GET_TOP_ATTACK_PATHS_PER_NODE_FAILURE,
  ];
  return genericThunkAction(actionTypes, getTopAttackPathsForNode, params);
}

export function getDocTopAttackPathsAction(params) {
  const actionTypes = [
    ActionTypes.GET_TOP_ATTACK_PATHS_PER_DOC_REQUEST,
    ActionTypes.GET_TOP_ATTACK_PATHS_PER_DOC_SUCCESS,
    ActionTypes.GET_TOP_ATTACK_PATHS_PER_DOC_FAILURE,
  ];
  return genericThunkAction(actionTypes, getTopVulnerableAttackPaths, params);
}


export function saveImageReportTableStateAction({ pageNumber = 0 }) {
  return {
    type: ActionTypes.SAVE_IMAGE_REPORT_TABLE_STATE,
    payload: pageNumber,
  };
}

export function getNodeCVESeverityAction(params) {
  const actionTypes = [
    ActionTypes.GET_CVE_SEVERITY_PER_NODE_REQUEST,
    ActionTypes.GET_CVE_SEVERITY_PER_NODE_SUCCESS,
    ActionTypes.GET_CVE_SEVERITY_PER_NODE_FAILURE,
  ];
  return genericThunkAction(actionTypes, groupby, params);
}

export function getVulnerabilitiesAction(params) {
  const actionTypes = [
    ActionTypes.GET_VULNERABILITIES_REQUEST,
    ActionTypes.GET_VULNERABILITIES_SUCCESS,
    ActionTypes.GET_VULNERABILITIES_FAILURE,
  ];
  return genericThunkAction(actionTypes, searchDocsWrapper, params);
}

export function getTopVulnerableNodesAction(params) {
  const actionTypes = [
    ActionTypes.TOP_VULNERABLE_NODES_REQUEST,
    ActionTypes.TOP_VULNERABLE_NODES_SUCCESS,
    ActionTypes.TOP_VULNERABLE_NODES_FAILURE,
  ];
  return genericThunkAction(actionTypes, groupby, params);
}

export function getTopVulnerableContainerAndHostsAction(params) {
  const actionTypes = [
    ActionTypes.TOP_VULNERABLE_NODES_REQUEST,
    ActionTypes.TOP_VULNERABLE_NODES_SUCCESS,
    ActionTypes.TOP_VULNERABLE_NODES_FAILURE,
  ];
  return genericThunkAction(
    actionTypes,
    getTopVulnerableContainerAndHosts,
    params
  );
}

export function xlsxReportDownloadAction(params) {
  const actionTypes = [
    // Repeating action names, as we not dependent on it for download
    ActionTypes.XLSX_REPORT_DOWNLOAD_REQUEST,
    ActionTypes.XLSX_REPORT_DOWNLOAD_SUCCESS,
    ActionTypes.XLSX_REPORT_DOWNLOAD_FAILURE,
  ];
  return genericThunkAction(actionTypes, xlsxReportDownload, params);
}

export function xlsxScheduleEmailAction(params) {
  const actionTypes = [
    ActionTypes.XLSX_EMAIL_SCHEDULE_REQUEST,
    ActionTypes.XLSX_EMAIL_SCHEDULE_SUCCESS,
    ActionTypes.XLSX_EMAIL_SCHEDULE_FAILURE,
  ];
  return genericThunkAction(actionTypes, xlsxScheduleEmail, params);
}

export function getPDFReportAction(params) {
  const actionTypes = [
    // Repeating action names, as we not dependent on it for download
    ActionTypes.PDF_REPORT_GENERATE_REQUEST,
    ActionTypes.PDF_REPORT_GENERATE_SUCCESS,
    ActionTypes.PDF_REPORT_GENERATE_FAILURE,
  ];
  return genericThunkAction(actionTypes, getPDFReport, params);
}

export function getPdfDownloadStatusAction(params) {
  const actionTypes = [
    ActionTypes.GET_PDF_REPORT_STATUS_REQUEST,
    ActionTypes.GET_PDF_REPORT_STATUS_SUCCESS,
    ActionTypes.GET_PDF_REPORT_STATUS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getPdfDownloadStatus, params);
}

export function downloadPdfReportAction(params) {
  const actionTypes = [
    ActionTypes.DOWNLOAD_PDF_REPORT_REQUEST,
    ActionTypes.DOWNLOAD_PDF_REPORT_SUCCESS,
    ActionTypes.DOWNLOAD_PDF_REPORT_FAILURE,
  ];
  return genericThunkAction(actionTypes, downloadPdfReport, params);
}

export function clearScheduledReportFormAction() {
  return {
    type: ActionTypes.XLSX_CLEAR_FORM_INFO_MESSAGE,
  };
}

export function getReportFilterOptionsAction() {
  const actionTypes = [
    ActionTypes.GET_REPORT_FILTER_OPTIONS_REQUEST,
    ActionTypes.GET_REPORT_FILTER_OPTIONS_SUCCESS,
    ActionTypes.GET_REPORT_FILTER_OPTIONS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getReportFilterOptions);
}

export function updateContainerRegistrySearchAction(params) {
  return {
    type: ActionTypes.UPDATE_CONTAINER_REGISTRY_SEARCH,
    payload: params,
  };
}

export function clearContainerRegistrySearchAction() {
  return {
    type: ActionTypes.CLEAR_CONTAINER_REGISTRY_SEARCH,
  };
}

export function enumerateFiltersAction(params) {
  const actionTypes = [
    ActionTypes.ENUMERATE_FILTERS_REQUEST,
    ActionTypes.ENUMERATE_FILTERS_SUCCESS,
    ActionTypes.ENUMERATE_FILTERS_FAILURE,
  ];
  return genericThunkAction(actionTypes, enumerateFilters, params);
}


export function enumerateNodesAction(params) {
  const actionTypes = [
    ActionTypes.ENUMERATE_NODES_REQUEST,
    ActionTypes.ENUMERATE_NODES_SUCCESS,
    ActionTypes.ENUMERATE_NODES_FAILURE,
  ];
  return genericThunkAction(actionTypes, enumerateNodes, params);
}

export function getScheduledTasksAction(params) {
  const actionTypes = [
    ActionTypes.GET_SCHEDULED_TASKS_REQUEST,
    ActionTypes.GET_SCHEDULED_TASKS_SUCCESS,
    ActionTypes.GET_SCHEDULED_TASKS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getScheduledTasks, params);
}

export function updateScheduledTasksAction(params) {
  const actionTypes = [
    ActionTypes.UPDATE_SCHEDULED_TASKS_REQUEST,
    ActionTypes.UPDATE_SCHEDULED_TASKS_SUCCESS,
    ActionTypes.UPDATE_SCHEDULED_TASKS_FAILURE,
  ];
  return genericThunkAction(actionTypes, updateScheduledTasks, params);
}

export function triggerRegistryRefreshAction(params) {
  const actionTypes = [
    ActionTypes.TRIGGER_REGISTRY_REFRESH_REQUEST,
    ActionTypes.TRIGGER_REGISTRY_REFRESH_SUCCESS,
    ActionTypes.TRIGGER_REGISTRY_REFRESH_FAILURE,
  ];
  return genericThunkAction(actionTypes, triggerRegistryRefresh, params);
}


export function getAlertsV2Action(params) {
  const actionTypes = [
    ActionTypes.GET_ALERTS_V2_REQUEST,
    ActionTypes.GET_ALERTS_V2_SUCCESS,
    ActionTypes.GET_ALERTS_V2_FAILURE,
  ];
  return genericThunkAction(actionTypes, searchDocsWrapper, params);
}

export function setTableColumnPreferenceAction(params) {
  const { tableName, columnIds } = params;

  const dataS = JSON.stringify(columnIds);

  localStorage.setItem(`${tableName}-tableColumnPreference`, dataS);

  return {
    type: ActionTypes.SET_TABLE_COLUMN_PREFERENCE,
    payload: {
      tableName,
      columnIds,
    },
  };
}

export function getTableColumnPreferenceAction(params) {
  const { tableName } = params;

  const dataS =
    localStorage.getItem(`${tableName}-tableColumnPreference`) || '[]';

  const columnIds = JSON.parse(dataS);

  return {
    type: ActionTypes.SET_TABLE_COLUMN_PREFERENCE,
    payload: {
      tableName,
      columnIds,
    },
  };
}

export function userUpdateAction(params) {
  const actionTypes = [
    ActionTypes.USER_UPDATE_REQUEST,
    ActionTypes.USER_UPDATE_SUCCESS,
    ActionTypes.USER_UPDATE_FAILURE,
  ];
  return genericThunkAction(actionTypes, userUpdate, params);
}

export function deleteScanActions(params) {
  const actionTypes = [
    ActionTypes.DELETE_SCAN_REQUEST,
    ActionTypes.DELETE_SCAN_SUCCESS,
    ActionTypes.DELETE_SCAN_FAILURE,
  ];
  return genericThunkAction(actionTypes, deleteScans, params);
}

export function userUpdateViewClearAction() {
  return {
    type: ActionTypes.USER_UPDATE_VIEW_CLEAR,
  };
}

export function ComponentChange() {
  return {
    type: ActionTypes.COMPONENT_CHANGE,
  };
}

export function integrationComponentChange() {
  return {
    type: ActionTypes.INTEGRATION_CHANGE,
  };
}

export function noIntegrationComponentChange() {
  return {
    type: ActionTypes.NO_INTEGRATION_CHANGE,
  };
}

export function breadcrumbChange(params) {
  return {
    type: ActionTypes.BREADCRUMB_CHANGE,
    payload: params,
  };
}

export function setIntegrationName(params) {
  return {
    type: ActionTypes.SET_INTEGRATION_NAME,
    payload: params,
  };
}

export function getUserAuditLogAction(params) {
  const actionTypes = [
    ActionTypes.USER_AUDIT_LOG_REQUEST,
    ActionTypes.USER_AUDIT_LOG_SUCCESS,
    ActionTypes.USER_AUDIT_LOG_FAILURE,
  ];
  return genericThunkAction(actionTypes, getUserAuditLog, params);
}


export function changeToGlobalConfig(params) {
  const actionTypes = [
    ActionTypes.DELETE_DIRECTORY_FILES_REQUEST,
    ActionTypes.DELETE_DIRECTORY_FILES_SUCCESS,
    ActionTypes.DELETE_DIRECTORY_FILES_FAILURE,
  ];
  return genericThunkAction(actionTypes, revertToDefault, params);
}

export function setTopologyClickedNode(node) {
  return {
    type: ActionTypes.SET_NODE_CLICK,
    node,
  };
}

export function getAllMailConfigurationsAction(params) {
  const actionTypes = [
    ActionTypes.GET_ALL_MAIL_CONFIGURATIONS_REQUEST,
    ActionTypes.GET_ALL_MAIL_CONFIGURATIONS_SUCCESS,
    ActionTypes.GET_ALL_MAIL_CONFIGURATIONS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getMailConfigurations, params);
}

export function deleteMailConfigurationsAction(params) {
  const actionTypes = [
    ActionTypes.DELETE_MAIL_CONFIGURATION_REQUEST,
    ActionTypes.DELETE_MAIL_CONFIGURATION_SUCCESS,
    ActionTypes.DELETE_MAIL_CONFIGURATION_FAILURE,
  ];
  return genericThunkAction(actionTypes, deleteMailConfiguration, params);
}

export function addMailConfigurationAction(params) {
  const actionTypes = [
    ActionTypes.ADD_MAIL_CONFIGURATION_REQUEST,
    ActionTypes.ADD_MAIL_CONFIGURATION_SUCCESS,
    ActionTypes.ADD_MAIL_CONFIGURATION_FAILURE,
  ];
  return genericThunkAction(actionTypes, addMailConfiguration, params);
}

export function getGlobalSettingsAction(params) {
  const actionTypes = [
    ActionTypes.GET_GLOBAL_SETTINGS_REQUEST,
    ActionTypes.GET_GLOBAL_SETTINGS_SUCCESS,
    ActionTypes.GET_GLOBAL_SETTINGS_FAILURE,
  ];
  return genericThunkAction(actionTypes, getGlobalSettings, params);
}

export function addGlobalSettingsAction(params) {
  const actionTypes = [
    ActionTypes.ADD_GLOBAL_SETTINGS_SUCCESS,
    ActionTypes.ADD_GLOBAL_SETTINGS_REQUEST,
    ActionTypes.ADD_GLOBAL_SETTINGS_FAILURE,
  ];
  return genericThunkAction(actionTypes, addGlobalSettings, params);
}

// multi cloud
export function setTopologyGraphAPI(api) {
  return {
    type: ActionTypes.SET_TOPOLOGY_GRAPH_API,
    api,
  };
}

export function showTopologyPanel(show) {
  return {
    type: ActionTypes.SHOW_TOPOLOGY_PANEL,
    show,
  };
}

export function setTopologyPanelNavStack(stack) {
  return {
    type: ActionTypes.SET_TOPOLOGY_PANEL_NAV_STACK,
    stack,
  };
}

export function addTopologyFilter(filter) {
  return {
    type: ActionTypes.ADD_TOPOLOGY_FILTER,
    filter,
  };
}

export function resetTopologyFilter() {
  return {
    type: ActionTypes.RESET_TOPOLOGY_FILTER,
  };
}

export function removeTopologyFilter(filter) {
  return {
    type: ActionTypes.REMOVE_TOPOLOGY_FILTER,
    filter,
  };
}

export function topologyFilterAdded(filter) {
  return {
    type: ActionTypes.TOPOLOGY_FILTER_ADDED,
    filter,
  };
}

export function topologyFilterRemoved(filter) {
  return {
    type: ActionTypes.TOPOLOGY_FILTER_REMOVED,
    filter,
  };
}
