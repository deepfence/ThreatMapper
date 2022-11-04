/* eslint-disable */
import debug from 'debug';
import reqwest from 'reqwest';
import { defaults } from 'lodash';
import { Map as makeMap, List } from 'immutable';

import {
  receiveDonutDetails,
  receiveNodeSpecificDetails, receiveAreaChartData,
  focusMaskedAlert, receivedThreatMetricDetails, receivedAlerts, receivedMaskAlertResponse,
  receiveGeoMapData, receiveVulnerabilityDeleteResponse,
  receiveLoginResponse, receiveLogoutResponse, receiveRegisterResponse, receiveUserProfileResponse,
  receivePasswordResetLinkResponse, receiveVerifyPasswordResponse, receiveChangePasswordResponse,
  receiveSignUpInviteResponse, receiveRegisterViaInviteResponse, receiveEulaResponse,
  receiveIntegrationAddResponse, receiveIntegrations, disableNotificationIcon, receiveNotifyAlertsResponse,
  receiveCveSeverityChartData, receiveSystemStatus, receiveClearDashBoardResponse,
  receiveTopologyMetrics
} from '../actions/app-actions';

import { getLuceneQuery } from './array-utils';
import {
  getAuthHeader,
  getRefreshToken,
} from '../helpers/auth-helper';
import { disableDashboardAccess } from './router-utils';
import {
  TOPOLOGY_ID_FOR_CONTAINER,
  TOPOLOGY_ID_FOR_HOST,
  TOPOLOGY_ID_FOR_PODS,
} from '../constants/naming';

const log = debug('scope:web-api-utils');

const csrfToken = (() => {
  // Check for token at window level or parent level (for iframe);
  /* eslint-disable no-underscore-dangle */
  const token =
    typeof window !== 'undefined'
      ? window.__DF_CSRF_TOKEN || window.parent.__DF_CSRF_TOKEN
      : null;
  /* eslint-enable no-underscore-dangle */
  if (!token || token === '$__CSRF_TOKEN_PLACEHOLDER__') {
    // Authfe did not replace the token in the static html.
    return null;
  }

  return token;
})();

// Method to return backend API end point
export function backendElasticApiEndPoint() {
  if (process.env.API_BASE_URL) {
    return `${process.env.API_BASE_URL}/deepfence/v1.5`;
  }
  return `${window.location.protocol}//${window.location.host}/deepfence/v1.5`;
}

export function diagnosisApiEndPoint() {
  if (process.env.API_BASE_URL) {
    return `${process.env.API_BASE_URL}/diagnosis`;
  }
  return `${window.location.protocol}//${window.location.host}/diagnosis`;
}

export function downloadApiEndPoint() {
  if (process.env.API_BASE_URL) {
    return `${process.env.API_BASE_URL}/df-api`;
  }
  return `${window.location.protocol}//${window.location.host}/df-api`;
}

export function getBackendBasePath() {
  if (process.env.API_BASE_URL) {
    return `${process.env.API_BASE_URL}`;
  }
  return `${window.location.protocol}//${window.location.host}`;
}

export function getSerializedTimeTravelTimestamp(state) {
  // The timestamp parameter will be used only if it's in the past.
  return state;
}

export function buildUrlQuery(params = makeMap(), state) {
  // Attach the time travel timestamp to every request to the backend.
  params = params.set('timestamp', getSerializedTimeTravelTimestamp(state));

  // Ignore the entries with values `null` or `undefined`.
  return params
    .map((value, param) => {
      if (value === undefined || value === null) return null;
      if (List.isList(value)) {
        value = value.join(',');
      }
      return `${param}=${value}`;
    })
    .filter(s => s)
    .join('&');
}

export function basePath(urlPath) {
  //
  // "/scope/terminal.html" -> "/scope"
  // "/scope/" -> "/scope"
  // "/scope" -> "/scope"
  // "/" -> ""
  //
  const parts = urlPath.split('/');
  // if the last item has a "." in it, e.g. foo.html...
  if (parts[parts.length - 1].indexOf('.') !== -1) {
    return parts.slice(0, -1).join('/');
  }
  return parts.join('/').replace(/\/$/, '');
}

export function basePathSlash(urlPath) {
  //
  // "/scope/terminal.html" -> "/scope/"
  // "/scope/" -> "/scope/"
  // "/scope" -> "/scope/"
  // "/" -> "/"
  //
  return `${basePath(urlPath)}/`;
}

export function getApiPath(pathname = window.location.pathname) {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  if (process.env.SCOPE_API_PREFIX) {
    return basePath(`${process.env.SCOPE_API_PREFIX}${pathname}`);
  }
  return basePath(pathname);
}

export function getWebsocketUrl(
  host = window.location.host,
  pathname = window.location.pathname
) {
  if (process.env.WS_BASE_URL) {
    return process.env.WS_BASE_URL;
  }
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProto}://${host}${process.env.SCOPE_API_PREFIX || ''}${basePath(
    pathname
  )}`;
}

/**
 * XHR wrapper. Applies a CSRF token (if it exists) and content-type to all requests.
 * Any opts that get passed in will override the defaults.
 */
export function doRequest(opts) {
  const config = defaults(opts, {
    contentType: 'application/json',
    type: 'json',
  });
  if (csrfToken) {
    config.headers = { ...config.headers, 'X-CSRF-Token': csrfToken };
  }
  if (!config.headers) {
    config.headers = {
      'deepfence-key': localStorage.getItem('dfApiKey'),
    };
  } else if (!('deepfence-key' in config.headers)) {
    config.headers['deepfence-key'] = localStorage.getItem('dfApiKey');
  }
  return reqwest(config);
}

//
// NEW API
//

/* START :: AUTH SECURE APIs */

export function getAreaChartData(dispatch, queryParams) {
  let url = `${backendElasticApiEndPoint()}/area-chart?number=${queryParams.number}&time_unit=${queryParams.time_unit}`;
  const luceneQuery = getLuceneQuery(queryParams.lucene_query);
  if (luceneQuery) {
    url = `${url}&lucene_query=${encodeURIComponent(luceneQuery)}`;
  }
  doRequest({
    method: 'GET',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader()
    },
    success: res => {
      const areaChartData = res.data;
      dispatch(receiveAreaChartData(areaChartData));
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api info request: ${error}`);
      }
    },
  });
}

export function getDonutDetails(dispatch, donutType, params) {
  let url = `${backendElasticApiEndPoint()}`;

  // Manipulating donut api url for topology view and alerts view.
  if (params.active_topology && params.active_topology === 'hosts') {
    url = `${url}/donut-host?field=${donutType}&number=${params.number}&time_unit=${params.time_unit}`;
  } else if (
    params.active_topology &&
    params.active_topology === 'containers'
  ) {
    url = `${url}/donut-container?field=${donutType}&number=${params.number}&time_unit=${params.time_unit}`;
  } else if (params.active_topology && params.active_topology === 'pods') {
    url = `${url}/donut-pod?field=${donutType}&number=${params.number}&time_unit=${params.time_unit}`;
  }
  // Getting lucene query in string format out of array.
  if (params.lucene_query) {
    const luceneQuery = getLuceneQuery(params.lucene_query);
    if (luceneQuery) {
      url = `${url}&lucene_query=${encodeURIComponent(luceneQuery)}`;
    }
  }
  let body;
  if (params.active_topology && params.active_topology === 'hosts') {
    body = JSON.stringify({
      host: params.active_host,
      public_ip: params.destination_ip,
      local_network: params.local_network,
    });
  } else if (
    params.active_topology &&
    params.active_topology === 'containers'
  ) {
    body = JSON.stringify({
      container_name: params.active_container,
      host: params.active_host.toString(),
      container_id: params.container_id,
    });
  } else if (params.active_topology && params.active_topology === 'pods') {
    body = JSON.stringify({
      pod_name: params.active_pod,
      pod_namespace: params.pod_namespace,
    });
  } else {
    body = JSON.stringify({});
  }
  doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: body,
    success: res => {
      if (res.success) {
        const donutDetails = res.data;
        dispatch(receiveDonutDetails(donutType, donutDetails));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api donut request: ${error}`);
      }
    },
  });
}

export function fetchNodeSpecificDetails(
  dispatch,
  sector,
  donut,
  activeNode,
  activeHost,
  kubeNamespace,
  activePod,
  activeTopologyId,
  destinationIp,
  containerIdArr,
  recordsFrom,
  recordsPerPage,
  sortOrder,
  activeFilter,
  activeOptions,
  number,
  time_unit
) {
  const body = {
    filters: {},
  };
  if (activeTopologyId === 'containers') {
    body.container_name = activeNode;
    body.host = activeHost;
    body.container_id = containerIdArr;
  } else if (activeTopologyId === 'hosts') {
    body.host = activeNode;
    body.public_ip = destinationIp[0];
    body.local_network = destinationIp[1].trim();
  } else if (activeTopologyId === TOPOLOGY_ID_FOR_PODS) {
    body.pod_name = activePod;
    body.pod_namespace = kubeNamespace;
  }
  if (activeFilter !== undefined) {
    // eslint-disable-next-line no-unused-vars
    for (const filter of activeFilter) {
      body.filters[filter] = activeOptions[filter];
    }
  } else {
    body.filters[donut] = sector;
  }

  let url = `${backendElasticApiEndPoint()}`;
  if (activeTopologyId === TOPOLOGY_ID_FOR_CONTAINER) {
    url = `${url}/donut-container-search?from=${recordsFrom}&size=${recordsPerPage}&sort_order=${sortOrder}&number=${number}&time_unit=${time_unit}`;
  } else if (activeTopologyId === TOPOLOGY_ID_FOR_HOST) {
    url = `${url}/donut-host-search?from=${recordsFrom}&size=${recordsPerPage}&sort_order=${sortOrder}&number=${number}&time_unit=${time_unit}`;
  } else if (activeTopologyId === TOPOLOGY_ID_FOR_PODS) {
    url = `${url}/donut-pod-search?from=${recordsFrom}&size=${recordsPerPage}&sort_order=${sortOrder}&number=${number}&time_unit=${time_unit}`;
  }
  doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(body),
    success: res => {
      dispatch(receiveNodeSpecificDetails(res));
      dispatch(receivedAlerts(res));
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function getTopologyMetrics(dispatch) {
  const url = `${backendElasticApiEndPoint()}/topology-metrics`;
  return doRequest({
    method: 'GET',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    success: res => {
      if (res.success) {
        const { data } = res;
        dispatch(receiveTopologyMetrics(data));
      }
    },
    error: error => {
      log(`Error in api host count request: ${error}`);
    },
  });
}

export function maskAlertDocument(
  dispatch,
  alertsCollection,
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
  const url = `${backendElasticApiEndPoint()}/mask-doc`;
  const body = {};
  body.docs = alertsCollection;
  doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(body),
    success: res => {
      if (res.success) {
        dispatch(
          focusMaskedAlert(
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
          )
        );
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        log(`Error in api node severity request: ${error}`);
      }
    },
  });
}

export function fetchAlertsData(dispatch, params) {
  const body = {
    _type: params.type,
    filters: {
      type: params.typeArr
    }
  };
  const { hideMasked = true } = params;
  if (hideMasked) {
    body.filters.masked = false;
  }
  if (params.hasOwnProperty('activeFilter') || params.activeFilter !== undefined) {
    for (const filter in params.activeFilter) {
      body.filters[filter] = params.activeFilter[filter];
    }
  }

  let url = `${backendElasticApiEndPoint()}/search?from=${params.activeIndex}&size=${params.recordsPerPage}&sort_order=${params.sortOrder}`;
  if (params.number && params.time_unit) {
    url = `${url}&number=${params.number}&time_unit=${params.time_unit}`
  }
  let luceneQuery = getLuceneQuery(params.lucene_query);
  if (luceneQuery) {
    url = `${url}&lucene_query=${encodeURIComponent(luceneQuery)}`
  }

  return doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader()
    },
    data: JSON.stringify(body),
    success: (res) => {
      dispatch(receivedAlerts(res));
    },
    error: (error) => {
      if (error.status == 401 || error.statusText == 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status == 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    }
  });
};

export function maskDocs(params) {
  const url = `${backendElasticApiEndPoint()}/maskedalerts`;
  const body = {};
  body.docs = params;
  return doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(body),
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api masking docs request: ${error}`);
      }
    },
  });
}

export function unmaskDocs(params, additionalParams = {}) {
  const url = `${backendElasticApiEndPoint()}/unmask-doc`;
  let body = {};
  body.docs = params.docs;
  if (additionalParams) {
    body = {
      ...body,
      ...additionalParams,
    };
  }
  return doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(body),
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api unmasking docs request: ${error}`);
      }
    },
  });
}

export function maskAlert(dispatch, params, additionalParams = {}) {
  const url = `${backendElasticApiEndPoint()}/mask-doc`;
  let body = {};
  body.docs = params.alertsCollection;
  if (additionalParams) {
    body = {
      ...body,
      ...additionalParams,
    };
  }
  return doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(body),
    success: res => {
      if (res.success) {
        dispatch(receivedMaskAlertResponse(params));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api node severity request: ${error}`);
      }
    },
  });
}

export function fetchGeoMapData(dispatch, params) {
  let url = `${backendElasticApiEndPoint()}/geo-map?number=${params.number
    }&time_unit=${params.time_unit}`;
  if (params.lucene_query.length > 0) {
    const luceneQuery = getLuceneQuery(params.lucene_query);
    url = `${url}&lucene_query=${encodeURIComponent(luceneQuery)}`;
  }
  doRequest({
    url,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    success: res => {
      if (res.success) {
        const geoMapData = res.data;
        dispatch(receiveGeoMapData(geoMapData));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api geo map ${error}`);
      }
    },
  });
}
/* END :: AUTH SECURE APIs */

/* START :: AUTH MODULE */
export function login(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/login`;
  const body = JSON.parse(JSON.stringify(params));
  doRequest({
    method: 'POST',
    url,
    data: JSON.stringify(body),
    success: response => {
      if (response.success) {
        const loginResponse = response;
        dispatch(receiveLoginResponse(loginResponse));
      }
    },
    error: error => {
      if (error) {
        dispatch(receiveLoginResponse(JSON.parse(error.response)));
        log(`Error in api login ${error}`);
      }
    },
  });
}

export function register(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/register`;
  const body = JSON.parse(JSON.stringify(params));
  doRequest({
    method: 'POST',
    url,
    data: JSON.stringify(body),
    success: res => {
      if (res.success) {
        const registerResponse = res;
        dispatch(receiveRegisterResponse(registerResponse));
      }
    },
    error: error => {
      if (error) {
        dispatch(receiveRegisterResponse(JSON.parse(error.response)));
        log(`Error in api register ${error}`);
      }
    },
  });
}

export function registerViaInvite(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/invite/accept`;
  const body = JSON.parse(JSON.stringify(params));
  doRequest({
    method: 'POST',
    url,
    data: JSON.stringify(body),
    success: res => {
      if (res.success) {
        const registerResponse = res;
        dispatch(receiveRegisterViaInviteResponse(registerResponse));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        dispatch(receiveRegisterViaInviteResponse(JSON.parse(error.response)));
        log(`Error in api register via invite ${error}`);
      }
    },
  });
}

export function logout(dispatch) {
  const url = `${backendElasticApiEndPoint()}/users/logout`;
  doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    success: res => {
      if (res.success) {
        const logoutResponse = res;
        dispatch(receiveLogoutResponse(logoutResponse));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        dispatch(receiveLogoutResponse());
      } else {
        log(`Error in api Logout ${error}`);
      }
    },
  });
}

export function getUserProfile(dispatch) {
  const url = `${backendElasticApiEndPoint()}/users/me`;
  doRequest({
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    url,
    success: res => {
      if (res.success) {
        const userProfileResponse = res.data;
        dispatch(receiveUserProfileResponse(userProfileResponse));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api user profile ${error}`);
      }
    },
  });
}

export function getPasswordResetLink(dispatch, params) {
  const base_url = encodeURIComponent(getBackendBasePath());
  const url = `${backendElasticApiEndPoint()}/users/password-reset/email?email=${params.email
    }&base_url=${base_url}`;
  doRequest({
    method: 'GET',
    url,
    success: res => {
      if (res.success) {
        const passwordResetLinkResponse = res;
        dispatch(receivePasswordResetLinkResponse(passwordResetLinkResponse));
      }
    },
    error: error => {
      if (error) {
        dispatch(receivePasswordResetLinkResponse(JSON.parse(error.response)));
        log(`Error in api password reset link ${error}`);
      }
    },
  });
}

export function verifyResetPassword(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/password-reset/verify`;
  const body = JSON.parse(JSON.stringify(params));
  doRequest({
    method: 'POST',
    url,
    data: JSON.stringify(body),
    success: res => {
      if (res.success) {
        const verifyPasswordResponse = res;
        dispatch(receiveVerifyPasswordResponse(verifyPasswordResponse));
      }
    },
    error: error => {
      if (error) {
        dispatch(receiveVerifyPasswordResponse(JSON.parse(error.response)));
        log(`Error in api verify password ${error}`);
      }
    },
  });
}

export function changePassword(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/password/change`;
  const body = JSON.parse(JSON.stringify(params));
  doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    url,
    data: JSON.stringify(body),
    success: res => {
      if (res.success) {
        const changePasswordResponse = res;
        dispatch(receiveChangePasswordResponse(changePasswordResponse));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        dispatch(receiveChangePasswordResponse(JSON.parse(error.response)));
        log(`Error in api change password ${error}`);
      }
    },
  });
}

export function inviteForSignUp(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/invite/send`;
  const body = JSON.parse(JSON.stringify(params));
  doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    url,
    data: JSON.stringify(body),
    success: res => {
      if (res.success) {
        const signUpInviteResponse = res;
        dispatch(receiveSignUpInviteResponse(signUpInviteResponse, params));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        dispatch(receiveSignUpInviteResponse(JSON.parse(error.response), params));
        log(`Error in api sign up invite ${error}`);
      }
    },
  });
}

export function getEula(dispatch) {
  const url = `${backendElasticApiEndPoint()}/eula`;
  doRequest({
    method: 'GET',
    url,
    success: res => {
      if (res.success) {
        const eulaResponse = res;
        dispatch(receiveEulaResponse(eulaResponse));
      }
    },
    error: error => {
      if (error) {
        log(`Error in api eula ${error}`);
      }
    },
  });
}

export function refreshAuthToken() {
  const url = `${backendElasticApiEndPoint()}/users/refresh/token`;
  return new Promise((resolve, reject) => {
    doRequest({
      method: 'POST',
      url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: getRefreshToken(),
      },
      success: response => {
        if (response.success) {
          localStorage.setItem('authToken', response.data.access_token);
          return resolve();
        }
        reject();
      },
      error: error => {
        if (error) {
          if (localStorage.getItem('authToken') != null) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('licenseStatus');
            disableDashboardAccess();
          }
        }
        reject();
      },
    });
  });
}

/* END :: AUTH MODULE */


/* START :: NOTIFICATION */

export function updateNotificationSeenStatus(dispatch) {
  const url = `${backendElasticApiEndPoint()}/dashboard-notifications/seen`;
  doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    url,
    success: response => {
      if (response.success) {
        dispatch(disableNotificationIcon());
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        log(`Error in api login ${error}`);
      }
    },
  });
}
/* END :: NOTIFICATION */

/* START :: INTEGRATION */
export function addMediaIntegration(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/integrations`;
  const body = JSON.parse(JSON.stringify(params));
  doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    url,
    data: JSON.stringify(body),
    success: response => {
      if (response.success) {
        const integrationAddResponse = response;
        getIntegrations(dispatch);
        dispatch(receiveIntegrationAddResponse(integrationAddResponse));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        dispatch(receiveIntegrationAddResponse(JSON.parse(error.response)));
        log(`Error in api login ${error}`);
      }
    },
  });
}

export function deleteMediaIntegration(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/integrations`;
  const body = JSON.parse(JSON.stringify(params));
  return doRequest({
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    url,
    data: JSON.stringify(body),
    success: response => {
      if (response.status === 204) {
        getIntegrations(dispatch);
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        log(`Error in api login ${error}`);
      }
    },
  });
}

export function getIntegrations(dispatch) {
  const url = `${backendElasticApiEndPoint()}/users/integrations`;
  doRequest({
    method: 'GET',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    success: res => {
      const integrationData = res.data;
      dispatch(receiveIntegrations(integrationData));
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        log(`Error in api integration request: ${error}`);
      }
    },
  });
}
/* END :: INTEGRATION */


export function deleteVulnerabilities(dispatch, params) {
  let url = `${backendElasticApiEndPoint()}/docs/delete`;
  const body = JSON.parse(JSON.stringify(params));
  doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader()
    },
    url,
    data: JSON.stringify(body),
    success: (response) => {
      if (response.success) {
        const deleteResponse = response;
        dispatch(receiveVulnerabilityDeleteResponse(deleteResponse));
      }
    },
    error: (error) => {
      if (error.status == 401 || error.statusText == 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        dispatch(receiveVulnerabilityDeleteResponse(JSON.parse(error.response)));
        log(`Error in api login ${error}`);
      }
    }
  });
};

/* START :: MANUAL NOTIFICATION */
export function notifyAlerts(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/integrations/notify`;
  const body = JSON.parse(JSON.stringify(params));
  return doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    url,
    data: JSON.stringify(body),
    success: response => {
      if (response.success) {
        const notifyAlertsResponse = response;
        dispatch(receiveNotifyAlertsResponse(notifyAlertsResponse));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else {
        dispatch(receiveNotifyAlertsResponse(JSON.parse(error.response)));
        log(`Error in api login ${error}`);
      }
    },
  });
}
/* END :: MANUAL NOTIFICATION */

/* START :: CVE VULNERABILITY */
export function getCveSeverityChartData(dispatch, params) {
  let url = `${backendElasticApiEndPoint()}/vulnerabilities/cve_severity_chart?number=${params.number
    }&time_unit=${params.time_unit}`;
  if (params.lucene_query.length !== 0) {
    const luceneQuery = getLuceneQuery(params.lucene_query);
    url = `${url}&lucene_query=${encodeURIComponent(luceneQuery)}`;
  }
  let body = {};
  const { cve_container_image, scan_id } = params;
  if (cve_container_image) {
    body = {
      filters: {
        cve_container_image,
        scan_id,
      },
    };
  }
  doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    success: res => {
      if (res.success) {
        const cveSeverityChartData = res.data;
        dispatch(receiveCveSeverityChartData(cveSeverityChartData));
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api geo map ${error}`);
      }
    }
  });
}

export function genericMaskDocs(dispatch, params) {
  let url = `${backendElasticApiEndPoint()}/mask-doc`;
  return doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(params),
    url,
    success: response => {
      if (response.status === 204) {
        getCloudCredentials(dispatch);
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api login ${error}`);
      }
    },
  });
};
/* END :: CVE VULNERABILITY */

/* START :: SYSTEM STATUS */
export function getSystemStatus(dispatch) {
  const url = `${backendElasticApiEndPoint()}/system/status`;
  doRequest({
    url,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader()
    },
    success: (res) => {
      if (res.success) {
        const systemStatusData = res.data;
        dispatch(receiveSystemStatus(systemStatusData));
      }
    },
    error: (error) => {
      if (error.status == 401 || error.statusText == 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status == 500) {
        dispatch(receiveSystemStatus(JSON.parse(error.response)));
      }
    },
  });
}
/* END :: SYSTEM STATUS */

export function deleteCredential(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/users/cloud_credentials/${params.cloud_provider}/${params.credential_id}`;
  return doRequest({
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader()
    },
    url,
    success: (response) => {
      if (response.status == 204) {
        getCloudCredentials(dispatch);
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api login ${error}`);
      }
    },
  });
}

export function resetAPIKey() {
  const url = `${backendElasticApiEndPoint()}/users/reset-api-key`;
  return doRequest({
    url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader()
    },
    data: JSON.stringify({}),
    success: (response) => {
    },
    error: (error) => {
    }
  });
}

export function getCVEScanStatus(imageId) {
  const imageIdEscaped = encodeURIComponent(imageId);
  const url = `${backendElasticApiEndPoint()}/cve-scan/${imageIdEscaped}`;
  return doRequest({
    url,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader()
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      }
    },
  });
}


export function searchDocs(type, query = {}, filters, fields = [], node_filters = [], sort_by, sort_order, top_exploitable = false ) {
  const pQuery = {
    ...query,
    lucene_query: encodeURIComponent(getLuceneQuery(query.lucene_query || [])),
  };
  const queryStr = Object.keys(pQuery).filter(
    key => pQuery[key] !== undefined
  ).map(key => ({
    key,
    value: pQuery[key],
  })).reduce((acc, el) => (acc ? `${acc}&${el.key}=${el.value}`
    : `?${el.key}=${el.value}`), '');
  let url = `${backendElasticApiEndPoint()}/search${queryStr}&sort_order=${sort_order}&sort_by=${sort_by}`;
  if (top_exploitable) {
    url = `${url}&top_exploitable=true`;
  }

  const body = {
    _type: type,
    _source: fields,
    filters,
    node_filters,
  };

  return doRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader()
    },
    data: JSON.stringify(body),
    error: (error) => {
      if (error.status == 401 || error.statusText == 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status == 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    }
  });
}

export function searchDocsWrapper({
  dispatch,
  type,
  query,
  filters,
  fields = [],
  node_filters = [],
  sort_by,
  sort_order,
  top_exploitable
} = params) {
  return searchDocs(type, query, filters, fields, node_filters, sort_by, sort_order, top_exploitable);
}

function getCVEReport(reportType, params = {}) {
  const { dispatch, lucene_query = [], cve_container_image } = params;
  let url = `${backendElasticApiEndPoint()}/vulnerabilities/report/${reportType}?lucene_query=${getLuceneQuery(
    lucene_query
  )}`;
  if (params.number && params.time_unit) {
    url = `${url}&number=${params.number}&time_unit=${params.time_unit}`;
  }
  let body = {};
  if (cve_container_image) {
    body = {
      filters: {
        cve_container_image,
      },
    };
  }
  return doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(body),
    headers: {
      'Content-Type': '',
      Authorization: getAuthHeader(),
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function getCVESeverityReport(params = {}) {
  return getCVEReport('cve_type', params);
}
export function getCVETypeReport(params = {}) {
  return getCVEReport('cve_type', params);
}
export function getCVEImageReport(params = {}) {
  const {
    dispatch,
    lucene_query = [],
    cve_container_image,
    scan_id,
    node_filters,
    start_index,
    size,
  } = params;
  let url = `${backendElasticApiEndPoint()}/vulnerabilities/image_report?lucene_query=${getLuceneQuery(
    lucene_query
  )}`;
  if (params.number && params.time_unit) {
    url = `${url}&number=${params.number}&time_unit=${params.time_unit}`;
  }
  const body = {
    node_filters,
    start_index,
    size,
  };
  if (cve_container_image) {
    body.filters = {
      cve_container_image,
      scan_id,
    };
  }
  return doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'cache-control': 'no-cache',
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function deleteDocsById(params = {}) {
  const { dispatch } = params;
  const url = `${backendElasticApiEndPoint()}/docs/delete_by_id`;
  return doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(params),
    headers: {
      'Content-Type': '',
      Authorization: getAuthHeader(),
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}


export function getSecretScanStatus(params = {}) {
  const { imageId } = params;
  const imageIdEscaped = encodeURIComponent(imageId);
  const url = `${backendElasticApiEndPoint()}/secret-scan/${imageIdEscaped}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function saveGceCredentialKey({
  dispatch,
  credentials_key,
  sa_email_address,
  project_id,
}) {
  const url = `${backendElasticApiEndPoint()}/gce_decryption_key`;
  const form = new FormData();
  form.append('gce_credential_key', params.credentials_key.file);
  form.append('sa_email_address', params.sa_email_address);
  form.append('project_id', params.project_id);
  return reqwest({
    url,
    method: 'POST',
    data: form,
    processData: false,
    headers: {
      Authorization: getAuthHeader(),
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

const errorHandler = (response, dispatch, skipJsonParsing) => {
  if (!response.ok) {
    if (response.status === 401 || response.statusText === 'UNAUTHORIZED') {
      refreshAuthToken();
    } else if (response.status === 403) {
      dispatch(receiveClearDashBoardResponse());
    } else {
      log(`Error in api modal details request: ${response}`);
    }
  }
  if (skipJsonParsing) {
    return response;
  }
  return response.json();
};

export function deleteUserDefinedCorrelationRule(params = {}) {
  const { correlationType, ruleId } = params;
  const url = `${backendElasticApiEndPoint()}/correlation/${correlationType}/${ruleId}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getAllUsers() {
  const url = `${backendElasticApiEndPoint()}/users`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function deleteUser(params = {}) {
  const { userId } = params;
  const url = `${backendElasticApiEndPoint()}/user/${userId}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function groupby(params) {
  const {
    number = 30,
    timeUnit = 'day',
    lucene_query: luceneQuery = [],
  } = params;
  const url = `${backendElasticApiEndPoint()}/groupby?number=${number}&time_unit=${timeUnit}&lucene_query=${getLuceneQuery(
    luceneQuery
  )}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(params),
  }).then(errorHandler);
}

export function topAffectedNodesChart(params) {
  const {
    number = 30,
    timeUnit = 'day',
    lucene_query: luceneQuery = [],
  } = params;
  const url = `${backendElasticApiEndPoint()}/top_affected_node?number=${number}&time_unit=${timeUnit}&lucene_query=${getLuceneQuery(
    luceneQuery
  )}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(params),
  }).then(errorHandler);
}

export function kubernetesGetAllPods(params) {
  const { dispatch, probeId, nodeId } = params;
  const url = `${getApiPath()}/api/control/${probeId}/${nodeId}/kubernetes_get_all_pods`;
  return doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(params),
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function kubernetesGetCNIPlugin(params) {
  const { dispatch, probeId, nodeId } = params;
  const url = `${getApiPath()}/api/control/${probeId}/${nodeId}/kubernetes_get_cni_plugin`;
  return doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(params),
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function getNodeStatus(params) {
  const { dispatch, nodeType, taglist = [] } = params;

  const taglistParamList = taglist.map(tag => `taglist=${tag}`);
  const taglistParam = taglistParamList.join('&');

  const nodeTypeParam = nodeType ? `node_type=${nodeType}&` : '';
  const url = `${backendElasticApiEndPoint()}/node_status?${nodeTypeParam}${taglistParam}`;
  return doRequest({
    url,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function getDiagnosticLogs(params = {}) {
  const url = `${backendElasticApiEndPoint()}/diagnosis/logs`;
  return fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  })
    .then(response => response.blob())
    .then(blob => {
      const fileURL = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'deepfence-logs.tgz';
      link.href = fileURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

export function getAgentLogs(params) {
  const url = `${backendElasticApiEndPoint()}/get_logs`;
  const data_list = {
    node_id_list: params.data,
    node_type: 'host',
  };
  const data = fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(data_list),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(response => response.blob()).then((blob) => {
    const fileURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'deepfence-agent-logs.tgz';
    link.href = fileURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  return data;
}

export function startCVEBulk(params = {}) {
  const {
    taglist = [],
    nodeType,
    scanType,
  } = params;
  const url = `${backendElasticApiEndPoint()}/vulnerability-scan/start-for-tag`;
  const data = {
    tags_list: taglist,
    node_type: nodeType,
    scan_type: scanType,
  };
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function addUserDefinedTags(params = {}) {
  const { nodeId, nodeType, taglist } = params;
  const url = `${backendElasticApiEndPoint()}/node/0/add_tags?scope_id=${nodeId}&node_type=${nodeType}`;
  const data = {
    user_defined_tags: taglist,
  };
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function deleteUserDefinedTags(params = {}) {
  const { nodeId, nodeType, taglist } = params;
  const url = `${backendElasticApiEndPoint()}/node/0/delete_tags?scope_id=${nodeId}&node_type=${nodeType}`;
  const data = {
    user_defined_tags: taglist,
  };
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getRunningNotification() {
  const url = `${backendElasticApiEndPoint()}/running_notification`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function startCVEScan(params = {}) {
  const { nodeId, nodeType, taglist, scanType, scanThisCluster, scanThisNamespace, priority = '' } = params;
  const url = `${backendElasticApiEndPoint()}/node/0/cve_scan_start?scope_id=${nodeId}&node_type=${nodeType}&priority=${priority}`;
  const data = {
    user_defined_tags: taglist,
    scanType,
    scan_type: scanType,
    "scan_this_cluster": scanThisCluster,
    "scan_this_namespace": scanThisNamespace,
  };
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function stopCVEScan(params = {}) {
  const { nodeId, nodeType } = params;
  const url = `${backendElasticApiEndPoint()}/node/0/cve_scan_stop?scope_id=${nodeId}&node_type=${nodeType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function startSecretScan(params = {}) {
  const { nodeId, nodeType } = params;
  const url = `${backendElasticApiEndPoint()}/node/0/secret_scan_start?scope_id=${nodeId}&node_type=${nodeType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getTopAttackPathsForNode(params = {}) {
  const { hostName, nodeType, scopeId, containerImage } = params;
  const url = `${backendElasticApiEndPoint()}/node/0/attack_path?node_type=${nodeType ?? ''}&host_name=${hostName ?? ''}&scope_id=${scopeId ?? ''}&container_image=${containerImage ?? ''}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getAttackPaths(params = {}) {
  const { number, time_unit, lucene_query = [], docId, graphType, timeUnit } = params;
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(lucene_query));

  const url = `${backendElasticApiEndPoint()}/attack-path?number=${number}&time_unit=${time_unit ?? timeUnit}&doc_id=${
    docId ?? ''
  }&lucene_query=${luceneQueryEscaped}&graph_type=${graphType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getNodeTags() {
  const url = `${backendElasticApiEndPoint()}/node_tags`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function vulnerabilityCSVDownload(params) {
  const { tag = '' } = params;
  const url = `${backendElasticApiEndPoint()}/vulnerability/csv?tag=${tag}`;
  return fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  })
    .then(response => response.blob())
    .then(blob => {
      const fileURL = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'vulnerabilities.csv';
      link.href = fileURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

export function listRegistryImages(params = {}) {
  const url = `${backendElasticApiEndPoint()}/enumerate`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function scanRegistryImages(params = {}) {
  const url = `${backendElasticApiEndPoint()}/node_action`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function secretsScanRegistryImages(params = {}) {
  const url = `${backendElasticApiEndPoint()}/secret/scan_registry`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}


export function saveRegistryCredentials(params = {}) {
  const url = `${backendElasticApiEndPoint()}/vulnerability/container_image_registry`;
  const form = new FormData();
  const { dispatch, file: fileObj = {}, ...restParams } = params;

  Object.keys(fileObj).forEach(key => form.append(key, fileObj[key].file));
  const jsonStrParams = JSON.stringify(restParams);
  form.append('credentials', jsonStrParams);
  return reqwest({
    url,
    method: 'POST',
    data: form,
    processData: false,
    headers: {
      Authorization: getAuthHeader(),
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function listRegistryCredentials(params = {}) {
  const { registryType } = params;

  const url = `${backendElasticApiEndPoint()}/vulnerability/container_image_registry?registry_type=${registryType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function deleteRegistryCredentials(params = {}) {
  const { registryId } = params;

  const url = `${backendElasticApiEndPoint()}/vulnerability/container_image_registry/${registryId}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getTopVulnerableContainerAndHosts(params = {}) {
  const { number, timeUnit, luceneQuery = [] } = params;

  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));

  const url = `${backendElasticApiEndPoint()}/vulnerability/top_vulnerable_nodes?number=${number}&time_unit=${timeUnit}&lucene_query=${luceneQueryEscaped}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getTopVulnerableActiveContainers(params = {}) {
  const { number, timeUnit, luceneQuery = [] } = params;
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));

  const url = `${backendElasticApiEndPoint()}/vulnerability/top_exploits?number=${number}&time_unit=${timeUnit}&lucene_query=${luceneQueryEscaped}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getTopVulnerableAttackPaths(params = {}) {
  const { number, timeUnit, luceneQuery = [], docId } = params;
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));

  const url = `${backendElasticApiEndPoint()}/vulnerabilities/attack_path?number=${number}&time_unit=${timeUnit}&doc_id=${docId ?? ''}&lucene_query=${luceneQueryEscaped}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}


export function getTopVulnerableActiveHosts(params = {}) {
  const { number, timeUnit, luceneQuery = [] } = params;

  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));

  const url = `${backendElasticApiEndPoint()}/vulnerability/top_vulnerable_hosts?number=${number}&time_unit=${timeUnit}&lucene_query=${luceneQueryEscaped}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function reportGenerate(params = {}) {
  const url = `${backendElasticApiEndPoint()}/node_action`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getSBOMByScanId(params = {}) {
  const {scanId, action = 'get', dispatch} = params;
  const url = `${backendElasticApiEndPoint()}/vulnerability/sbom`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify({
      action,
      filters: {
        scan_id: scanId
      }
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then((response) => errorHandler(response, dispatch, action === 'download'));
}

export function reportDownloadStatus(params = {}) {
  const url = `${backendElasticApiEndPoint()}/detailed_report_status`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function downloadReport(params = {}) {
  const { path = '' } = params;
  const splitPath = path.split('/');
  let filename = splitPath[splitPath.length - 1];
  const url = `${downloadApiEndPoint()}/downloadFile`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'deepfence-key': localStorage.getItem('dfApiKey'),
      DF_FILE_NAME: path,
    },
  })
    .then(response => {
      return new Promise((resolve, reject) => {
        if (response.ok) {
          resolve(response.blob());
        } else {
          if (response.status === 400) {
            response.json().then(
              jObj => {
                reject({
                  ...jObj.error,
                  code: response.status,
                });
              },
              error => {
                reject({
                  message: 'Failed to decode',
                  code: 'FTDJ',
                });
              }
            );
          } else {
            reject({
              message: 'Failed to fetch file',
              code: 'FFEF',
            });
          }
        }
      });
    })
    .then(blob => {
      const fileURL = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = fileURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

export function reportScheduleEmail(params = {}) {
  const url = `${backendElasticApiEndPoint()}/node_action`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getReportFilterOptions() {
  const url = `${backendElasticApiEndPoint()}/report_filter_options`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function enumerateFilters(params = {}) {
  const url = `${backendElasticApiEndPoint()}/enumerate_filters?`;
  const urlWithQueryParams = Object.keys(params).reduce((acc, key) => {
    const value = params[key];
    if (key === 'formId' || key === "dispatch") {
      // do not pass formId/dispatch to api
      return acc;
    } else if (value !== '' && value !== undefined && value !== null) {
      acc += `${key}=${value}&`;
    }
    return acc;
  }, url);
  return fetch(urlWithQueryParams, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function enumerateNodes(params = {}) {
  const url = `${backendElasticApiEndPoint()}/enumerate`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getScheduledTasks() {
  const url = `${backendElasticApiEndPoint()}/scheduled_tasks`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function updateScheduledTasks(params = {}) {
  const url = `${backendElasticApiEndPoint()}/scheduled_tasks/update`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function triggerRegistryRefresh(params = {}) {
  const url = `${backendElasticApiEndPoint()}/update_registry_images_list`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function userUpdate(params = {}) {
  const { id: userId } = params;
  const url = `${backendElasticApiEndPoint()}/user/${userId}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function deleteScans(params = {}) {
  const url = `${backendElasticApiEndPoint()}/docs/delete`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getUserAuditLog(params = {}) {
  const url = `${backendElasticApiEndPoint()}/user-activity-log`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getMailConfigurations() {
  const url = `${backendElasticApiEndPoint()}/settings/email_configuration`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function deleteMailConfiguration(params = {}) {
  const { id } = params;
  const url = `${backendElasticApiEndPoint()}/settings/email_configuration/${id}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function addMailConfiguration(params = {}) {
  const url = `${backendElasticApiEndPoint()}/settings/email_configuration`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getGlobalSettings() {
  const url = `${backendElasticApiEndPoint()}/settings`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function addGlobalSettings(params = {}) {
  const url = `${backendElasticApiEndPoint()}/settings/${params.id}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify({
      key: params.key,
      value: params.value
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}


export function getRuntimeBomData(params = {}) {
  const { lucene_query: luceneQuery = [], start_index, size } = params;
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));
  const url = `${backendElasticApiEndPoint()}/vulnerabilities/runtime_bom?lucene_query=${luceneQueryEscaped}&start_index=${start_index}&size=${size}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getRegistryImagesTags(params = {}) {
  const url = `${backendElasticApiEndPoint()}/registry_images_tags`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getSecretScanData(params = {}) {
  const {
    dispatch,
    filters,
    start_index,
    size,
    lucene_query: luceneQuery = []
  } = params;
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));

  let url = `${backendElasticApiEndPoint()}/secret/node_report?lucene_query=${luceneQueryEscaped}`;
  const body = {
    filters,
    start_index,
    size,
  };
  return doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'cache-control': 'no-cache',
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function getSecretScanResults(params = {}) {
  const {
    dispatch,
    filters,
    start_index,
    size,
    lucene_query: luceneQuery = [],
  } = params;
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));
  let url = `${backendElasticApiEndPoint()}/secret/scan_results?lucene_query=${luceneQueryEscaped}`;
  const body = {
    filters,
    start_index,
    size,
  };
  return doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'cache-control': 'no-cache',
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function getTopSecretScanContainerAndHosts(params) {

  const { luceneQuery = [] } = params;

  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));

  const url = `${backendElasticApiEndPoint()}/secret/top_exposing_nodes?lucene_query=${luceneQueryEscaped}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getSecretScanReportChart(params) {
  const { globalSearchQuery = [] } = params;

  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(globalSearchQuery));

  const url = `${backendElasticApiEndPoint()}/secret/report?lucene_query=${luceneQueryEscaped}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      // 'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getSecretScanChartData(params, dispatch) {
  let url = `${backendElasticApiEndPoint()}/secret/secret_severity_chart?number=${params.number
    }&time_unit=${params.time_unit}`;
  if (params.lucene_query.length !== 0) {
    const luceneQuery = getLuceneQuery(params.lucene_query);
    url = `${url}&lucene_query=${encodeURIComponent(luceneQuery)}`;
  }
  let body = {};
  const { scan_id } = params;
  body = {
    filters: {
      scan_id,
    },
  };
  return doRequest({
    url,
    method: 'POST',
    data: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'cache-control': 'no-cache',
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        // dispatch(receiveLogoutResponse());
        refreshAuthToken();
      } else if (error.status === 403) {
        dispatch(receiveClearDashBoardResponse());
      } else {
        log(`Error in api modal details request: ${error}`);
      }
    },
  });
}

export function secretScanMaskDocs(dispatch, params) {
  let url = `${backendElasticApiEndPoint()}/secret/mask-doc`;
  return doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(params),
    url,
    success: response => {
      if (response.status === 204) {
        getCloudCredentials(dispatch);
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api login ${error}`);
      }
    },
  });
};

export function secretScanUnmaskDocs(dispatch, params) {
  let url = `${backendElasticApiEndPoint()}/secret/unmask-doc`;
  return doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(params),
    url,
    success: response => {
      if (response.status === 204) {
        getCloudCredentials(dispatch);
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api login ${error}`);
      }
    },
  });
};


export function startComplianceScan(params ={}) {
  const { nodeId, checkTypes, cloudType} = params;
  const requestBody = {
    node_type: cloudType,
    compliance_check_type: checkTypes,
  };
  const url = `${backendElasticApiEndPoint()}/cloud-compliance-scan/${nodeId}/start`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function complianceScheduleScan(params = {}) {
  const { nodeId, checkTypes, cloudType, scheduleScanIntervel} = params;
  const requestBody = {
    action: 'schedule_compliance_scan',
    node_type: cloudType,
    action_args: {
      cron: `0 0 */${scheduleScanIntervel} * *`,
      compliance_check_type: checkTypes,
      node_id: nodeId
    },
  };

  const url = `${backendElasticApiEndPoint()}/node_action`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getComplianceTests({ checkType }) {
  const url = `${backendElasticApiEndPoint()}/compliance/${checkType}/controls`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function updateComplianceTests(params = {}) {
  const url = `${backendElasticApiEndPoint()}/compliance/update_controls`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getComplianceRules(params = {}) {
  const { lucene_query: luceneQuery = [], checkType, cloudType, nodeId} = params;
  const url = `${backendElasticApiEndPoint()}/compliance/${checkType}/controls?cloud_provider=${cloudType}&node_id=${nodeId}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

// individual cloud creds
export function getComplianceCloudCredentials(params = {}) {
  const { cloud_provider } = params;
  const url = `${backendElasticApiEndPoint()}/cloud-compliance-scan/nodes?cloud_provider=${cloud_provider}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

// refreshes the cloud resources
export function refreshCloudComplianceResources(params = {}) {
  const { nodeId } = params;
  const url = `${backendElasticApiEndPoint()}/cloud-compliance/${nodeId}/refresh`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

// scan list for speific node and check type.
export function getComplianceScanList(params = {}) {
  const { lucene_query: luceneQuery = [], nodeId, checkType, cloudType, from = 0, number, time_unit } = params;
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));
  const url = `${backendElasticApiEndPoint()}/cloud-compliance-scan/scans?number=${number}&time_unit=${time_unit}&size=10&start_index=${from}&lucene_query=${luceneQueryEscaped}&node_id=${nodeId}&compliance_check_type=${checkType}&node_type=${cloudType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

// centre chart data scan results.
export function getComplianceChartData(params = {}) {
  const { lucene_query: luceneQuery = [], checkType, nodeId, cloudType, number, time_unit } = params;
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));
  const url = `${backendElasticApiEndPoint()}/cloud-compliance-scan/summary?number=${number}&time_unit=${time_unit}&lucene_query=${luceneQueryEscaped}&node_id=${nodeId}&compliance_check_type=${checkType}&node_type=${cloudType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getComplianceBarChart(params = {}) {
  const { lucene_query: luceneQuery = [], checkType, resource, nodeId, scanId, cloudType, number, time_unit} = params;
  const requestBody = {
    scan_id: scanId,
  };
  if (resource) {
    requestBody.filters = { resource };
  }
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));
  const url = `${backendElasticApiEndPoint()}/compliance/${checkType}/test_category_report?&lucene_query=${luceneQueryEscaped}&number=${number}&time_unit=${time_unit}&node_type=${cloudType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}


// Donut chart Scan Results
export function getResultDonutData(params = {}) {
  const { lucene_query: luceneQuery = [], checkType, resource, nodeId, scanId, cloudType, number, time_unit} = params;
  const filters = {};
  if (resource) {
    filters.resource = resource;
  }
  const requestBody = {
    scan_id: scanId,
    filters
  };
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));
  const url = `${backendElasticApiEndPoint()}/compliance/${checkType}/test_status_report?&lucene_query=${luceneQueryEscaped}&number=${number}&time_unit=${time_unit}&node_type=${cloudType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function complianceMaskDocs(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/compliance/mask_doc`;
  const { cloudType, selectedDocIndexValues } = params;
  const requestBody = {
    docs: selectedDocIndexValues,
    node_type: cloudType,
  };
  return doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(requestBody),
    url,
    success: response => {
      if (response.status === 204) {
        getCloudCredentials(dispatch);
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api login ${error}`);
      }
    },
  });
}


export function complianceUnmaskDocs(dispatch, params) {
  const url = `${backendElasticApiEndPoint()}/compliance/unmask_doc`;
  const { cloudType, selectedDocIndexValues } = params;
  const requestBody = {
    docs: selectedDocIndexValues,
    node_type: cloudType,
  };
  return doRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    data: JSON.stringify(requestBody),
    url,
    success: response => {
      if (response.status === 204) {
        getCloudCredentials(dispatch);
      }
    },
    error: error => {
      if (error.status === 401 || error.statusText === 'UNAUTHORIZED') {
        refreshAuthToken();
      } else {
        log(`Error in api login ${error}`);
      }
    },
  });
};


// Scan results
export function getScanResults(params = {}) {
  const {
    lucene_query: luceneQuery = [],
    nodeId,
    resource,
    checkType,
    scanId,
    pageSize,
    page,
    cloudType,
    hideMasked,
  } = params;
  const from = page ? page * pageSize : page;
  let filters = {};
  if (hideMasked === true) {
    filters = {
      masked: false,
      node_id: nodeId,
      scan_id: scanId,
      compliance_check_type: checkType,
    };
  } else {
    filters = {
      node_id: nodeId,
      scan_id: scanId,
      compliance_check_type: checkType,
    };
  }
  if (resource) {
    filters.resource = resource;
  }
  const requestBody = {
    _type: 'cloud-compliance-scan',
    filters,
  };
  const luceneQueryEscaped = encodeURIComponent(getLuceneQuery(luceneQuery));
  const url = `${backendElasticApiEndPoint()}/compliance/search?from=${from}&size=20&lucene_query=${luceneQueryEscaped}&number=0&time_unit=all&hideMasked=${hideMasked}&node_type=${cloudType}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getResourcesForCloudService(params = {}) {
  const { nodeid, serviceid } = params;
  const url = `${backendElasticApiEndPoint()}/cloud-compliance/cloud_resource/${nodeid}?node_type=${encodeURIComponent(serviceid)}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getServicesForCloudAccount(params = {}) {
  const { nodeid } = params;
  const url = `${backendElasticApiEndPoint()}/cloud-compliance/cloud_resources/${nodeid}`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getAttackGraphData(params = {}) {
  const url = `${backendElasticApiEndPoint()}/threat-graph/graph`;
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}

export function getAttackGraphNodeInfo(params = {}) {
  const { nodeId } = params;
  const url = new URL(`${backendElasticApiEndPoint()}/threat-graph/node`);
  url.searchParams.append('graph_node_id', nodeId);
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
  }).then(errorHandler);
}
