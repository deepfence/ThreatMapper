/*eslint-disable*/

import debug from 'debug';
import moment from 'moment';
import {
  List as makeList,
  Map as makeMap,
  OrderedMap as makeOrderedMap,
} from 'immutable';
import { reducer as formReducer } from 'redux-form/immutable';

import ActionTypes from '../constants/action-types';

import { GRAPH_VIEW_MODE } from '../constants/naming';
import CVEReducer from './cve-reducer';
import DFTableMultiSelectColumnReducer from './df-table-multi-select-column-reducer';
import ReportDownloadReducer from './report-download-reducer';
import nodesViewReducer from './nodes-view-reducer';
import {
  REFRESH_INTERVALS_OPTIONS,
  TIME_BOUNDARY_OPTIONS,
} from '../constants/dashboard-refresh-config';

const error = debug('scope:error');

// Initial values

export const initialState = makeMap({
  capabilities: makeMap(),
  contrastMode: false,
  controlPipes: makeOrderedMap(), // pipeId -> controlPipe
  controlStatus: makeMap(),
  currentTopology: null,
  currentTopologyId: null,
  errorUrl: null,
  exportingGraph: false,
  forceRelayout: false,
  gridSortedBy: null,
  gridSortedDesc: null,
  hostname: '...',
  hoveredMetricType: null,
  initialNodesLoaded: false,
  mouseOverEdgeId: null,
  mouseOverNodeId: null,
  nodeDetails: makeOrderedMap(), // nodeId -> details
  nodes: makeOrderedMap(), // nodeId -> node
  nodesLoaded: false,
  // nodes cache, infrequently updated, used for search & resource view
  nodesByTopology: makeMap(), // topologyId -> nodes
  // class of metric, e.g. 'cpu', rather than 'host_cpu' or 'process_cpu'.
  // allows us to keep the same metric "type" selected when the topology changes.
  pausedAt: null,
  pinnedMetricType: null,
  pinnedNetwork: null,
  plugins: makeList(),
  pinnedSearches: makeList(), // list of node filters
  routeSet: false,
  searchFocused: false,
  searchQuery: null,
  selectedNetwork: null,
  selectedNodeId: null,
  showingHelp: false,
  showingTimeTravel: false,
  showingTroubleshootingMenu: false,
  showingNetworks: false,
  timeTravelTransitioning: false,
  topologies: makeList(),
  topologiesLoaded: false,
  topologyOptions: makeOrderedMap(), // topologyId -> options
  topologyUrlsById: makeOrderedMap(), // topologyId -> topologyUrl
  topologyViewMode: GRAPH_VIEW_MODE,
  version: '...',
  versionUpdate: null,
  viewport: makeMap(),
  websocketClosed: false,
  zoomCache: makeMap(),
  serviceImages: makeMap(),
  alertStats: '',
  isDonutDetailsModalVisible: false,
  isTableJSONViewModal: false,
  isSideNavCollapsed: false,
  isFiltersViewVisible: false,
  isToasterVisible: false,
  globalSearchQuery: [],
  alertPanelHistoryBound: TIME_BOUNDARY_OPTIONS[7],
  refreshInterval: REFRESH_INTERVALS_OPTIONS[2],
  navigate: makeMap(),
  toggleFullWindow: false,
  policyViewList: [],
  changeComponent: false,
  changeIntegration: false,
  integrationName: null,
  topologyClickedNodeId: null,
  topologyFilters: makeList(),
  showTopologyPanel: false,
  topologyPanelNavStack: []
});

const combineState = (currentGlobalState, reducerName, reducerFunc, action) => {
  const currentReducerState = currentGlobalState.get(reducerName);
  const newReducerState = reducerFunc(currentReducerState, action);
  const newGlobalState = currentGlobalState.set(reducerName, newReducerState);
  return newGlobalState;
};

export function rootReducer(state = initialState, action) {
  if (!action.type) {
    error('Payload missing a type!', action);
  }

  switch (action.type) {
    case ActionTypes.SET_VIEW_MODE: {
      return state.set('topologyViewMode', action.viewMode);
    }

    case ActionTypes.SET_NODE_CLICK: {
      state = state.set('topologyClickedNodeId', action.node.id);
      state = state.set('topologyPanelNavStack', [action.node.id]);
      state = state.setIn(['nodeDetails', action.node.id], {
        id: action.node.id,
        label: action.node.label,
        origin,
      });
      return state;
    }

    case ActionTypes.RECEIVE_ERROR: {
      if (state.get('errorUrl') !== null) {
        state = state.set('errorUrl', action.errorUrl);
      }
      return state;
    }

    case ActionTypes.RECEIVE_NODE_DETAILS: {
      // Ignore the update if paused and the timestamp didn't change.
      const setTimestamp = state.getIn([
        'nodeDetails',
        action.details.id,
        'timestamp',
      ]);
      state = state.set('errorUrl', null);

      // disregard if node is not selected anymore
      if (state.hasIn(['nodeDetails', action.details.id])) {
        // nodeFlags holds basic information about the node
        const nodeFlags = {};
        let metaIndex = {};
        if (action.details.metadata) {
          metaIndex = action.details.metadata.reduce((acc, el) => {
            acc[el.id] = el.value;
            return acc;
          }, {});
        }

        // host flags
        nodeFlags.isHost = action.details.id.indexOf('<host>') !== -1;

        // container flags
        nodeFlags.isContainer = action.details.id.indexOf('<container>') !== -1;
        const { parents: nodeParents = [] } = action.details;
        nodeFlags.isContainerManagedByKube =
          nodeParents.filter(el => el.topologyId === 'pods').length > 0;

        // pod flags
        nodeFlags.isPod = action.details.id.indexOf('<pod>') !== -1;
        nodeFlags.isPodOnHostNetwork =
          nodeFlags.isPod && metaIndex.kubernetes_is_in_host_network === 'true';

        // pod service flags
        nodeFlags.isPodService = action.details.id.indexOf('<service>') !== -1;
        nodeFlags.isPodServiceKubeTypeNodePortOrLB =
          nodeFlags.isPodService &&
          metaIndex.kubernetes_type !== '' &&
          metaIndex.kubernetes_type !== 'ClusterIP';

        // check for windows platform
        nodeFlags.isWindows = metaIndex.os
          ? metaIndex.os.toLowerCase().includes('windows')
          : false;

        // pre-parsed basic info about node
        const nodeInfo = {};
        if (action.details.controls && action.details.controls.length > 0) {
          nodeInfo.probeId = action.details.controls[0].probeId;
        }

        state = state.updateIn(['nodeDetails', action.details.id], obj => ({
          ...obj,
          notFound: false,
          timestamp: action.requestTimestamp,
          details: action.details,
          nodeFlags: {
            ...obj.nodeFlags,
            ...nodeFlags,
          },
          nodeInfo,
        }));
      }
      return state;
    }

    case ActionTypes.RECEIVE_NOT_FOUND: {
      if (state.hasIn(['nodeDetails', action.nodeId])) {
        state = state.updateIn(['nodeDetails', action.nodeId], obj => ({
          ...obj,
          timestamp: action.requestTimestamp,
          notFound: true,
        }));
      }
      return state;
    }

    // @TODO get the nodes from the state
    //  and get the clusterId from there

    case ActionTypes.RECEIVE_API_DETAILS: {
      state = state.set('errorUrl', null);

      return state.merge({
        capabilities: action.capabilities,
        hostname: action.hostname,
        plugins: action.plugins,
        version: action.version,
        versionUpdate: action.newVersion,
      });
    }

    case ActionTypes.REQUEST_SERVICE_IMAGES: {
      return state.setIn(['serviceImages', action.serviceId], {
        isFetching: true,
      });
    }

    case ActionTypes.EXPAND_SIDE_NAVIGATION: {
      state = state.set('isSideNavCollapsed', false);
      return state;
    }

    case ActionTypes.COLLAPSE_SIDE_NAVIGATION: {
      state = state.set('isSideNavCollapsed', true);
      return state;
    }

    case ActionTypes.TOGGLE_FILTER_VIEW: {
      state = state.set('isFiltersViewVisible', action.showFilters);
      return state;
    }

    case ActionTypes.RECEIVE_VULNERABILITY_STATS: {
      state = state.set(
        'total_vulnerabilities',
        action.vulnerabilityStats.alerts
      );
      state = state.set(
        'critical_vulnerabilities',
        action.vulnerabilityStats.severities.critical
      );
      state = state.set(
        'high_vulnerabilities',
        action.vulnerabilityStats.severities.high
      );
      state = state.set(
        'medium_vulnerabilities',
        action.vulnerabilityStats.severities.medium
      );
      state = state.set(
        'low_vulnerabilities',
        action.vulnerabilityStats.severities.low
      );
      return state;
    }

    case ActionTypes.GET_TOPOLOGY_METRICS: {
      state = state.set('topologyMetrics', action.response);
      return state;
    }

    case ActionTypes.RECEIVE_AREA_CHART_DATA: {
      state = state.set('areaChartData', action.areaChartData);
      return state;
    }

    case ActionTypes.SELECT_ALERT_HISTORY_BOUND: {
      state = state.set('alertPanelHistoryBound', action.data);
      return state;
    }

    case ActionTypes.SET_SEARCH_QUERY: {
      state = state.set('globalSearchQuery', action.searchQuery.searchQuery);
      return state;
    }

    case ActionTypes.SET_SEARCH_BAR_VALUE: {
      state = state.set('searchBarValue', action.searchQuery.searchQuery);
      return state;
    }

    case ActionTypes.SELECT_REFRESH_INTERVAL: {
      state = state.set('refreshInterval', action.data);
      return state;
    }

    case ActionTypes.RECEIVE_SEVERITY_DONUT_DETAILS: {
      state = state.set('severityDonutDetails', action.donutDetails);
      return state;
    }

    case ActionTypes.RECEIVE_ANOMALY_DONUT_DETAILS: {
      state = state.set('anomalyDonutDetails', action.donutDetails);
      return state;
    }

    case ActionTypes.RECEIVE_RESOURCE_DONUT_DETAILS: {
      state = state.set('resourceDonutDetails', action.donutDetails);
      return state;
    }

    case ActionTypes.RESET_DONUT_STORE_STAETS: {
      state = state.set('severityDonutDetails', undefined);
      state = state.set('anomalyDonutDetails', undefined);
      state = state.set('resourceDonutDetails', undefined);
      return state;
    }

    case ActionTypes.OPEN_DONUT_DETAILS_MODAL: {
      state = state.set('isDonutDetailsModalVisible', true);
      return state;
    }

    case ActionTypes.CLOSE_DONUT_DETAILS_MODAL: {
      state = state.set('isDonutDetailsModalVisible', false);
      return state;
    }

    case ActionTypes.SAVE_PREV_FILE_LIST: {
      state = state.set('file_list', action.payload);
      return state;
    }

    case ActionTypes.RECEIVE_NODE_SPECIFIC_DETAILS: {
      state = state.set('nodeSpecificDetails', action.nodeSpecificDetails);
      return state;
    }

    case ActionTypes.GET_VULNERABILITIES_SUCCESS: {
      state = state.set('nodeSpecificDetails', action.payload);
      return state;
    }
    case ActionTypes.RECEIVE_ALERTS: {
      state = state.set('alertsCollection', action.alertsCollection);
      const alertList = action.alertsCollection.data.hits;
      const newAlertIndex = alertList.reduce((acc, alertInst) => {
        /* eslint-disable no-underscore-dangle */
        acc[alertInst._id] = alertInst;
        /* eslint-enable */
        return acc;
      }, {});
      const currentAlertIndex = state.get('alertIndex');
      const alertIndex = {
        ...currentAlertIndex,
        ...newAlertIndex,
      };
      state = state.set('alertIndex', alertIndex);
      return state;
    }

    case ActionTypes.CLEAR_ALERTS_TABLE: {
      state = state.set('alertsCollection', undefined);
      return state;
    }

    case ActionTypes.OPEN_TABLE_JSON_MODAL: {
      state = state.set('isTableJSONViewModal', true);
      return state;
    }

    case ActionTypes.CLOSE_TABLE_JSON_MODAL: {
      state = state.set('isTableJSONViewModal', false);
      return state;
    }

    case ActionTypes.UPDATE_TABLE_JSON_MODAL_VIEW: {
      state = state.set('tableJSONViewData', action.data);
      return state;
    }

    case ActionTypes.UPDATE_TABLE_JSON_MODAL_META: {
      const currentState = state.get('tableJSONViewData');
      state = state.set('tableJSONViewData', {
        ...currentState,
        meta: {
          ...currentState.meta,
          ...action.payload,
        },
      });
      return state;
    }
    case ActionTypes.UPDATE_TABLE_JSON_MODAL_META_FAILURE: {
      const currentState = state.get('tableJSONViewData');
      state = state.set('tableJSONViewData', {
        ...currentState,
        meta: {
          ...currentState.meta,
          isPartialData: false,
        },
      });
      return state;
    }

    case ActionTypes.SET_ACTIVE_SECTOR: {
      state = state.set('activeDonut', action.activeDonut);
      state = state.set('activeSector', action.activeSector);
      state = state.set('activeNode', action.activeNode);
      state = state.set('activeHost', action.activeHost);
      state = state.set('kubeNamespace', action.kubeNamespace);
      state = state.set('activePod', action.activePod);
      state = state.set('activeTopologyId', action.activeTopologyId);
      state = state.set('destinationIp', action.destinationIp);
      state = state.set('containerIdArr', action.containerId);
      return state;
    }

    case ActionTypes.SET_ACTIVE_FILTERS: {
      state = state.set('activeFilter', action.activeFilter);
      state = state.set('activeOptions', action.activeOptions);
      return state;
    }

    // FOCUS MASKED ALERT
    case ActionTypes.FOCUS_MASKED_ALERT_ROW: {
      state = state.set('isAlertMasked', true);
      return state;
    }
    // UN FOCUS MASKED ALERT
    case ActionTypes.UN_FOCUS_MASKED_ALERT_ROW: {
      state = state.set('isAlertMasked', false);
      return state;
    }

    case ActionTypes.RECEIVE_THREAT_METRIC_DETAILS: {
      state = state.set('threatMetricDetails', action.response);
      return state;
    }

    case ActionTypes.RECEIVE_CVE_SEVERITY_CHART_DATA: {
      state = state.set('cveSeverityChartData', action.response);
      return state;
    }

    case ActionTypes.RECEIVE_GEO_MAP_DATA: {
      state = state.set('geoMapData', action.response.data);
      return state;
    }

    case ActionTypes.LOGIN_FAILED: {
      state = state.set('submitting', false);
      state = state.set('errorMsg', action.response.error.message);
      return state;
    }

    case ActionTypes.RECEIVE_REGISTRATION_RESPONSE: {
      state = state.set('responseMsg', action.response.message);
      state = state.set('isSuccess', action.response.isSuccess);
      state = state.set('isError', action.response.isError);
      return state;
    }

    case ActionTypes.RECEIVE_USER_PROFILE: {
      state = state.set('userProfile', action.response);
      return state;
    }

    case ActionTypes.PASSWORD_RESET_LINK_RESPONSE: {
      state = state.set('responseMsg', action.response.message);
      state = state.set('isSuccess', action.response.isSuccess);
      state = state.set('isError', action.response.isError);
      return state;
    }

    case ActionTypes.RECEIVE_PASSWORD_CHANGE_RESPONSE: {
      state = state.set('responseMsg', action.response.message);
      state = state.set('isSuccess', action.response.isSuccess);
      state = state.set('isError', action.response.isError);
      return state;
    }

    case ActionTypes.RECEIVE_SIGN_UP_INVITE_RESPONSE: {
      state = state.set('responseMsg', action.response.message);
      state = state.set('isSuccess', action.response.isSuccess);
      state = state.set('isError', action.response.isError);
      return state;
    }

    case ActionTypes.RECEIVE_SIGN_UP_VIA_INVITE_RESPONSE: {
      state = state.set('responseMsg', action.response.message);
      state = state.set('isError', action.response.isError);
      return state;
    }

    case ActionTypes.RECEIVE_EULA_RESPONSE: {
      state = state.set('eulaContent', action.response.data);
      return state;
    }

    case ActionTypes.TOGGLE_NAVBAR_STATE: {
      state = state.set('isNavbarActive', action.response);
      return state;
    }

    case ActionTypes.SELECTED_ACTIVE_MENU: {
      state = state.set('isSelectedMenu', action.response.menuName);
      return state;
    }

    case ActionTypes.RESET_USER_MANAGEMENT_STATES: {
      state = state.set('isSuccess', false);
      state = state.set('isError', false);
      state = state.set('alertsDeleteResponse', '');
      return state;
    }

    case ActionTypes.RECEIVE_AUTH_MODULE_STATES: {
      state = state.set('isSuccess', false);
      state = state.set('isError', false);
      state = state.set('responseMsg', '');
      state = state.set('errorMsg', '');
      return state;
    }

    case ActionTypes.ENABLE_NOTIFICATION_ICON: {
      state = state.set('isNotificationIconEnable', true);
      return state;
    }

    case ActionTypes.DISABLE_NOTIFICATION_ICON: {
      state = state.set('isNotificationIconEnable', false);
      return state;
    }

    case ActionTypes.RECEIVE_INTEGRATION_ADD_RESPONSE: {
      state = state.set('isSuccess', action.response.isSuccess);
      state = state.set('isError', action.response.isError);
      state = state.set(
        'integrationAddResponse',
        action.response.integrationAddResponse
      );
      return state;
    }

    case ActionTypes.RECEIVE_INTEGRATION_RESPONSE: {
      state = state.set('availableEmailIntegrations', action.response.email);
      state = state.set('availableSlackIntegrations', action.response.slack);
      state = state.set(
        'availableMicrosoftTeamsIntegrations',
        action.response.microsoft_teams
      );
      state = state.set(
        'availablePagerDutyIntegrations',
        action.response.pagerduty
      );
      state = state.set('availableStrideIntegrations', action.response.stride);
      state = state.set('availableSplunkIntegrations', action.response.splunk);
      state = state.set(
        'availableElasticsearchIntegrations',
        action.response.elasticsearch
      );
      state = state.set('availableAWSS3Integrations', action.response.s3);
      state = state.set(
        'availableHTTPEndpoints',
        action.response.http_endpoint
      );
      state = state.set('availableGoogleChronicleIntegrations', action.response.google_chronicle);
      state = state.set('availableJiraIntegrations', action.response.jira);
      state = state.set(
        'availableSumoLogicIntegrations',
        action.response.sumo_logic
      );
      state = state.set('IntegrationStatus', action.response);
      return state;
    }

    case ActionTypes.RESET_INTEGRATION_STATES: {
      state = state.set('isSuccess', false);
      state = state.set('isError', false);
      state = state.set('integrationAddResponse', '');
      return state;
    }

    case ActionTypes.TOASTER_NOTIFICATION_SHOW: {
      state = state.set('toasterNotificationText', action.payload);
      state = state.set('isToasterVisible', true);
      return state;
    }

    case ActionTypes.TOASTER_NOTIFICATION_HIDE: {
      state = state.set('isToasterVisible', false);
      return state;
    }

    case ActionTypes.RECEIVE_SYSTEM_STATUS: {
      state = state.set('systemStatusDetails', action.response);
      return state;
    }

    case ActionTypes.RECEIVE_CLEAR_DASHBOARD_RESPONSE: {
      state = state.set('total_vulnerabilities', 0);
      state = state.set('critical_vulnerabilities', 0);
      state = state.set('high_vulnerabilities', 0);
      state = state.set('medium_vulnerabilities', 0);
      state = state.set('low_vulnerabilities', 0);
      state = state.set('cveSeverityChartData', []);
      state = state.set('severityDonutDetails', undefined);
      state = state.set('anomalyDonutDetails', undefined);
      state = state.set('resourceDonutDetails', undefined);
      state = state.set('threatMapData', undefined);
      state = state.set('geoMapData', undefined);
      state = state.set('areaChartData', undefined);
      state = state.set('nodeSpecificDetails', undefined);
      state = state.set('nodeSeverity', undefined);
      state = state.set('userProfile', undefined);
      state = state.set('cveSeverityChartData', undefined);
      return state;
    }

    case ActionTypes.SHOW_MODAL: {
      state = state.setIn(['modal', 'show'], true);
      state = state.setIn(['modal', 'modalProps'], action.payload.modalProps);
      state = state.setIn(['modal', 'modalType'], action.payload.modalType);
      return state;
    }

    case ActionTypes.HIDE_MODAL: {
      state = state.setIn(['modal', 'show'], false);
      state = state.setIn(['modal', 'modalProps'], {});
      state = state.setIn(['modal', 'modalType'], '');
      return state;
    }

    case ActionTypes.RESET_API_KEY_REQUEST: {
      state = state.setIn(['userProfileMeta', 'loading'], true);
      state = state.setIn(['userProfileMeta', 'error'], false);
      return state;
    }

    case ActionTypes.RESET_API_KEY_SUCCESS: {
      state = state.set('userProfile', action.payload.data);
      state = state.setIn(['userProfileMeta', 'loading'], false);
      return state;
    }

    case ActionTypes.RESET_API_KEY_FAILURE: {
      state = state.setIn(
        ['userProfileMeta', 'error'],
        'Sorry, your request to refresh API Key failed'
      );
      state = state.setIn(['userProfileMeta', 'loading'], false);
      return state;
    }

    case ActionTypes.CVE_FOR_HOST_REQUEST: {
      state = state.setIn(['cve_by_host', action.input, 'loading'], true);
      return state;
    }
    case ActionTypes.CVE_FOR_HOST_SUCCESS: {
      state = state.setIn(['cve_by_host', action.input, 'loading'], false);
      const rawData = action.payload.data;
      /* eslint-disable no-underscore-dangle */
      const index = rawData.hits.reduce((acc, data) => {
        acc[data._id] = data;
        return acc;
      }, {});
      /* eslint-enable */
      state = state.setIn(['cve_by_host', action.input, 'index'], index);
      const now = new Date().getTime();
      state = state.setIn(['alerts_by_host', action.input, 'timestamp'], now);
      return state;
    }
    case ActionTypes.CVE_FOR_HOST_FAILURE: {
      state = state.setIn(['cve_by_host', action.input, 'loading'], false);
      return state;
    }

    case ActionTypes.GET_CLASSTYPES_MASTER_SUCCESS: {
      const {
        payload: {
          data: {
            system_classtypes: systemClasstypes = {},
            user_defined_classtypes: userDefinedClasstypes = {},
          } = {},
          success,
          error: apiError,
        } = {},
      } = action;

      const userDefinedClasstypeList = Object.keys(userDefinedClasstypes).map(
        key => ({
          id: key,
          name: key,
          intent: userDefinedClasstypes[key],
        })
      );

      state = state.setIn(
        ['correlation', 'user_defined', 'masterlist', 'classtype'],
        userDefinedClasstypeList
      );

      const classtypeList = Object.keys(systemClasstypes).map(key => ({
        id: key,
        name: key,
        intent: systemClasstypes[key],
      }));

      const intentSet = new Set();
      classtypeList.map(classtype => classtype.intent.map(intent => intentSet.add(intent)));
      const intentList = [...intentSet].map(intent => ({
        id: intent,
        name: intent,
      }));

      state = state.setIn(['masterlist', 'classtype', 'list'], classtypeList);
      state = state.setIn(['masterlist', 'intent', 'list'], intentList);
      if (!success) {
        state = state.setIn(
          ['masterlist', 'classtype', 'error', 'message'],
          apiError.message
        );
        // as there is not separate API for intent list, an error on
        // classtype reducer is same as error on intent reducer
        state = state.setIn(
          ['masterlist', 'intent', 'error', 'message'],
          apiError.message
        );
      }

      return state;
    }

    case ActionTypes.GET_ALL_USERS_SUCCESS: {
      const {
        payload: { data },
      } = action;

      state = state.set('user_list', data);
      return state;
    }

    case ActionTypes.DELETE_USER_SUCCESS: {
      const {
        payload: { error: apiError, success },
        input: { userId },
      } = action;

      if (success) {
        const userList = state.get('user_list');
        const deleteIndex = userList.findIndex(el => el.id === userId);
        userList.splice(deleteIndex, 1);
        const updatedList = userList.map(el => el);
        state = state.set('user_list', updatedList);
      } else {
        state = state.setIn(
          ['user_delete_response', 'error', 'message'],
          apiError.message
        );
        state = state.setIn(
          ['user_delete_response', 'error', 'timestamp'],
          moment().unix()
        );
      }
      return state;
    }

    case ActionTypes.DELETE_USER_FAILURE: {
      state = state.setIn(
        ['user_delete_response', 'error', 'message'],
        'Sorry, failed to delete user. Delete rules and policies created by the user and try again'
      );
      state = state.setIn(
        ['user_delete_response', 'error', 'timestamp'],
        moment().unix()
      );
      return state;
    }

    case ActionTypes.GET_ALL_KUBERNETES_PODS_REQUEST: {
      const {
        input: { nodeId },
      } = action;

      state = state.setIn(
        ['kubernetes_pods', 'neighbors', nodeId, 'loading'],
        true
      );
      state = state.removeIn([
        'kubernetes_pods',
        'neighbors',
        nodeId,
        'error',
        'message',
      ]);
      return state;
    }

    case ActionTypes.GET_ALL_KUBERNETES_PODS_SUCCESS: {
      const {
        input: { nodeId },
        payload: {
          pods_list: podIndex = {
            pod1: 'pod1', // Adding fixtures untill API is ready
            pod2: 'pod2',
            pod3: 'pod3',
            pod4: 'pod4',
          },
        },
      } = action;

      const podList = Object.keys(podIndex).map(key => ({
        kubernetesPodId: key,
        podName: podIndex[key],
      }));

      state = state.setIn(
        ['kubernetes_pods', 'neighbors', nodeId, 'loading'],
        false
      );
      state = state.setIn(
        ['kubernetes_pods', 'neighbors', nodeId, 'data'],
        podList
      );
      return state;
    }

    case ActionTypes.GET_ALL_KUBERNETES_PODS_FAILURE: {
      const {
        input: { nodeId },
      } = action;

      state = state.setIn(
        ['kubernetes_pods', 'neighbors', nodeId, 'loading'],
        false
      );
      state = state.setIn(
        ['kubernetes_pods', 'neighbors', nodeId, 'error', 'message'],
        'Failed to load pods'
      );
      return state;
    }

    case ActionTypes.GET_KUBERNETES_CNI_PLUGIN_REQUEST: {
      const {
        input: { nodeId },
      } = action;

      state = state.setIn(
        ['kubernetes_pods', 'cni_plugin', nodeId, 'loading'],
        true
      );
      return state;
    }

    case ActionTypes.GET_KUBERNETES_CNI_PLUGIN_SUCCESS: {
      const {
        input: { nodeId },
        payload: {
          cni_plugin: cniPlugin = '', // empty string indicated no n/w plugins installed
        },
      } = action;

      if (state.hasIn(['nodeDetails', nodeId])) {
        const currentNode = state.getIn(['nodeDetails', nodeId]);
        const {
          nodeFlags: {
            isPod,
            isPodOnHostNetwork,
            isPodService,
            isPodServiceKubeTypeNodePortOrLB,
          } = {},
        } = currentNode;

        let isKubeCNIPluginSupported = true;
        if (isPod && !isPodOnHostNetwork && cniPlugin.includes('flannel')) {
          isKubeCNIPluginSupported = false;
        } else if (
          isPodService
          && isPodServiceKubeTypeNodePortOrLB
          && cniPlugin !== 'weave-net'
          && cniPlugin !== 'calico-node'
          && cniPlugin !== ''
        ) {
          isKubeCNIPluginSupported = false;
        }

        state = state.updateIn(['nodeDetails', nodeId], obj => ({
          ...obj,
          nodeFlags: {
            ...obj.nodeFlags,
            isKubeCNIPluginSupported,
          },
        }));
      }
      state = state.setIn(
        ['kubernetes_pods', 'cni_plugin', nodeId, 'loading'],
        false
      );
      state = state.setIn(
        ['kubernetes_pods', 'cni_plugin', nodeId, 'data'],
        cniPlugin
      );
      return state;
    }

    case ActionTypes.GET_KUBERNETES_CNI_PLUGIN_FAILURE: {
      const {
        input: { nodeId },
      } = action;

      state = state.setIn(
        ['kubernetes_pods', 'cni_plugin', nodeId, 'loading'],
        false
      );
      return state;
    }

    case ActionTypes.MASK_DOCS_REQUEST: {
      state = state.setIn(['disable_alert_rule', 'loading'], true);
      return state;
    }

    case ActionTypes.MASK_DOCS_SUCCESS: {
      state = state.setIn(['disable_alert_rule', 'loading'], false);
      state = state.setIn(['rule', 'isDisabled'], true);
      return state;
    }

    case ActionTypes.MASK_DOCS_FAILURE: {
      const { error: { message } = {} } = action;
      state = state.setIn(['disable_alert_rule', 'loading'], false);
      state = state.setIn(['rule', 'isDisabled'], false);
      state = state.setIn(['disable_alert_rule', 'error', 'message'], message);
      return state;
    }

    case ActionTypes.ADD_USER_DEFINED_TAGS_REQUEST: {
      const { input: { nodeId } = {} } = action;

      state = state.deleteIn(['userDefinedTags', nodeId]);
      return state;
    }

    case ActionTypes.ADD_USER_DEFINED_TAGS_SUCCESS: {
      const { input: { nodeId } = {} } = action;

      state = state.setIn(
        ['userDefinedTags', nodeId, 'addView', 'message'],
        'Request to add tag successfully queued'
      );
      return state;
    }

    case ActionTypes.ADD_USER_DEFINED_TAGS_FAILURE: {
      const { input: { nodeId } = {} } = action;

      state = state.setIn(
        ['userDefinedTags', nodeId, 'addView', 'error', 'message'],
        'Request to add tag failed'
      );
      return state;
    }

    case ActionTypes.DELETE_USER_DEFINED_TAGS_REQUEST: {
      const { input: { nodeId } = {} } = action;

      state = state.deleteIn(['userDefinedTags', nodeId]);
      return state;
    }

    case ActionTypes.DELETE_USER_DEFINED_TAGS_SUCCESS: {
      const { input: { nodeId } = {} } = action;

      state = state.setIn(
        ['userDefinedTags', nodeId, 'deleteView', 'message'],
        'Request to delete tag(s) successfully queued'
      );
      return state;
    }

    case ActionTypes.DELETE_USER_DEFINED_TAGS_FAILURE: {
      const { input: { nodeId } = {} } = action;

      state = state.setIn(
        ['userDefinedTags', nodeId, 'deleteView', 'error', 'message'],
        'Request to delete tag(s) failed'
      );
      return state;
    }

    case ActionTypes.CLEAR_USER_DEFINED_TAGS: {
      const { input: { nodeId } = {} } = action;

      state = state.deleteIn(['userDefinedTags', nodeId]);
      return state;
    }

    case ActionTypes.GET_RUNNING_NOTIFICATION_SUCCESS: {
      const { payload: { data } = {} } = action;
      const parseFloatRegex = /\d+(\.*\d*)/g;
      const pData = data.map((notification) => {
        if (
          notification.source_application_id
          === 'deepfence_console_resource_usage_notification'
        ) {
          const match = notification.content.match(parseFloatRegex);
          let classname = '';
          let processedContent = '';
          if (match && match.length === 2) {
            const cpuPercent = match[0];
            const memPercent = match[1];
            if (notification.content.includes('Critical')) {
              classname = 'red-dot';
            } else if (notification.content.includes('Warning')) {
              classname = 'orange-dot';
            } else if (notification.content.includes('Safe')) {
              classname = 'green-dot';
            }
            processedContent = `CPU: ${cpuPercent}% Memory: ${memPercent}%`;
          }
          return {
            ...notification,
            content: processedContent,
            classname,
          };
        }
        if (
          notification.source_application_id === 'cve_db_update_notification'
        ) {
          return {
            ...notification,
            classname: 'green-dot',
          };
        }
        if (
          notification.source_application_id
          === 'integration_if_any_failure_notification'
          && notification.content.includes('failing')
        ) {
          return {
            ...notification,
            classname: 'red-dot',
          };
        }
        if (
          notification.source_application_id
          === 'integration_if_any_failure_notification'
          && notification.content.includes('okay')
        ) {
          return {
            ...notification,
            classname: 'green-dot',
          };
        }
        if (
          notification.source_application_id === 'deepfence_health_notification'
        ) {
          return {
            ...notification,
            classname: 'orange-dot',
          };
        }
        return notification;
      });

      state = state.set('running_notifications', pData);
      return state;
    }

    case ActionTypes.GET_NODE_TAGS_SUCCESS: {
      const { payload: { data } = {} } = action;

      state = state.set('node_tags', data);
      return state;
    }

    case 'TOGGLE_TOP_BAR': {
      state = state.set('toggleFullWindow', action.status);
      return state;
    }

    case 'UPDATE_POLICY_LIST': {
      state = state.set('policyViewList', action.payload);
      return state;
    }

    case ActionTypes.GET_REPORT_FILTER_OPTIONS_SUCCESS: {
      const { payload: { data = {} } = {} } = action;
      state = state.set('report_filter_options', data);
      return state;
    }


    case ActionTypes.UPDATE_LICENSE_THRESHOLD_REQUEST: {
      state = state.delete('updateLicenseErrorMessage');
      state = state.delete('updateLicenseInfo');
      return state;
    }
    case ActionTypes.UPDATE_LICENSE_THRESHOLD_SUCCESS: {
      const { payload: { data = {}, success, error: respError } = {} } = action;
      if (success) {
        state = state.set('notification_threshold_percentage', data);
        state = state.set('updateLicenseInfo', 'Successfully saved');
        state = state.delete('updateLicenseErrorMessage');
      } else {
        let errorMessage = '';
        if (respError) {
          errorMessage = respError.message;
        }
        state = state.set('updateLicenseErrorMessage', errorMessage);
        state = state.delete('updateLicenseInfo');
      }
      return state;
    }

    case ActionTypes.UPDATE_LICENSE_THRESHOLD_FAILURE: {
      state = state.set(
        'updateLicenseErrorMessage',
        'Something went wrong while updating license'
      );
      return state;
    }

    case ActionTypes.GET_SCHEDULED_TASKS_SUCCESS: {
      const { payload: { data: { scheduled_tasks: data = [] } = {} } = {} } = action;

      state = state.setIn(['scheduledTasks', 'data'], data);
      return state;
    }

    case ActionTypes.GET_ALERTS_V2_SUCCESS: {
      const { payload: { data: { hits = [], total = 0 } = {} } = {} } = action;

      /* eslint-disable no-underscore-dangle */
      const alerts = hits.map(hit => ({
        ...hit._source,
        doc_index: hit._index,
      }));
      state = state.setIn(['alertsView', 'data'], alerts);
      state = state.setIn(['alertsView', 'total'], total);
      return state;
    }

    case ActionTypes.SET_TABLE_COLUMN_PREFERENCE: {
      const {
        payload: { tableName, columnIds },
      } = action;

      state = state.setIn(['DFTablePreferences', tableName], columnIds);
      return state;
    }

    case ActionTypes.USER_UPDATE_REQUEST: {
      state = state.deleteIn(['updateUserView', 'message']);
      state = state.deleteIn(['updateUserView', 'error']);
      return state;
    }

    case ActionTypes.USER_UPDATE_SUCCESS: {
      const { payload: { error: apiError, success } = {} } = action;

      if (success) {
        state = state.setIn(
          ['updateUserView', 'message'],
          'User Updated Successfully'
        );
      } else if (apiError) {
        state = state.setIn(['updateUserView', 'error'], apiError.message);
      }

      return state;
    }

    case ActionTypes.USER_UPDATE_FAILURE: {
      state = state.setIn(
        ['updateUserView', 'error'],
        'Something went wrong while updating user'
      );
      return state;
    }

    case ActionTypes.USER_UPDATE_VIEW_CLEAR: {
      state = state.deleteIn(['updateUserView', 'message']);
      state = state.deleteIn(['updateUserView', 'error']);
      return state;
    }

    case ActionTypes.COMPONENT_CHANGE: {
      return state.set('changeComponent', true);
    }


    case ActionTypes.NO_COMPONENT_CHANGE: {
      return state.set('changeComponent', false);
    }

    case ActionTypes.INTEGRATION_CHANGE: {
      return state.set('changeIntegration', true);
    }
    case ActionTypes.NO_INTEGRATION_CHANGE: {
      return state.set('changeIntegration', false);
    }

    case ActionTypes.SET_INTEGRATION_NAME: {
      return state.set('integrationName', action.payload);
    }

    case ActionTypes.REPORT_GENERATION_REQUEST: {
      state = state.setIn(['reportForm', 'form', 'loading'], true);
      state = state.deleteIn(['reportForm', 'form', 'error', 'message']);
      state = state.deleteIn(['reportForm', 'form', 'info']);
      return state;
    }

    case ActionTypes.REPORT_GENERATION_SUCCESS: {
      const { payload } = action;

      state = state.setIn(['reportForm', 'form', 'loading'], false);
      if (payload.error) {
        const errorMessage = payload.error.message;
        state = state.setIn(
          ['reportForm', 'form', 'error', 'message'],
          errorMessage
        );
      } else {
        state = state.setIn(
          ['reportForm', 'form', 'info'],
          'Report Generation has started'
        );
      }
      return state;
    }

    case ActionTypes.REPORT_GENERATION_FAILURE: {
      state = state.setIn(['reportForm', 'form', 'loading'], false);
      state = state.setIn(
        ['reportForm', 'form', 'error', 'message'],
        'Something went wrong'
      );
      return state;
    }

    case ActionTypes.REPORT_STATUS_REQUEST: {
      state = state.setIn(['reportForm', 'status', 'loading'], true);
      return state;
    }

    case ActionTypes.REPORT_STATUS_SUCCESS: {
      const {
        payload: { data = [] } = {},
        input: { initiatedByPollable } = {},
      } = action;

      state = state.setIn(['reportForm', 'status', 'loading'], false);
      state = state.setIn(['reportForm', 'status', 'data'], data);
      state = state.setIn(
        ['reportForm', 'status', 'initiatedByPollable'],
        initiatedByPollable
      );
      return state;
    }

    case ActionTypes.REPORT_STATUS_FAILURE: {
      state = state.setIn(['reportForm', 'status', 'loading'], false);
      return state;
    }

    case ActionTypes.DOWNLOAD_REPORT_REQUEST: {
      const { input: { path } = {} } = action;
      state = state.setIn(
        ['reportForm', 'fileDownload', path, 'loading'],
        true
      );
      return state;
    }

    case ActionTypes.DOWNLOAD_REPORT_SUCCESS: {
      const { input: { path } = {} } = action;
      state = state.setIn(
        ['reportForm', 'fileDownload', path, 'loading'],
        false
      );
      return state;
    }

    case ActionTypes.DOWNLOAD_REPORT_FAILURE: {
      const { input: { path } = {}, payload: { message } = {} } = action;
      state = state.setIn(
        ['reportForm', 'fileDownload', path, 'loading'],
        false
      );
      state = state.setIn(
        ['reportForm', 'fileDownload', path, 'error', 'message'],
        message
      );
      return state;
    }
    
    case ActionTypes.REPORT_EMAIL_SCHEDULE_REQUEST: {
      state = state.setIn(['report', 'loading'], true);
      state = state.deleteIn(['report', 'info']);
      return state;
    }

    case ActionTypes.REPORT_EMAIL_SCHEDULE_SUCCESS: {
      const {payload} = action;
      state = state.setIn(['report', 'loading'], false);
      state = state.setIn(['report', 'info'], 'Schedule for email reports set successfully');
      if (action.payload && payload.error) {
        state = state.setIn(['report', 'info'], payload.error);
      }
      else {
        state = state.setIn(['report', 'info'], 'Schedule for email reports set successfully');
      }
      return state;
    }

    case ActionTypes.REPORT_EMAIL_SCHEDULE_FAILURE: {
      state = state.setIn(['report', 'loading'], false);
      state = state.setIn(['report', 'info'], 'Error in scheduling email reports');
      return state;
    }

    case ActionTypes.BREADCRUMB_CHANGE: {
      return state.set('breadcrumb', action.payload);
    }

    case ActionTypes.USER_AUDIT_LOG_REQUEST: {
      state = state.setIn(['userAuditLogs', 'status', 'loading'], true);
      return state;
    }

    case ActionTypes.USER_AUDIT_LOG_SUCCESS: {
      const { payload: { data = [] } = {} } = action;
      state = state.setIn(['userAuditLogs', 'status', 'loading'], false);
      state = state.setIn(['userAuditLogs', 'data'], data.user_audit_logs);
      state = state.setIn(['userAuditLogs', 'total'], data.total);
      return state;
    }

    case ActionTypes.USER_AUDIT_LOG_FAILURE: {
      state = state.setIn(['userAuditLogs', 'status', 'loading'], false);
      return state;
    }

    case ActionTypes.GET_ALL_FILE_DIRECTORY_SUCCESS: {
      const {
        payload: { data },
      } = action;
      state = state.set('file_list', data);
      return state;
    }

    case ActionTypes.DELETE_DIRECTORY_FILES_SUCCESS: {
      const {
        payload: { data },
      } = action;

      state = state.set('file_list', data);
      return state;
    }

    case ActionTypes.GET_ALL_MAIL_CONFIGURATIONS_SUCCESS: {
      const {
        payload: { data },
      } = action;
      state = state.set('mail_configurations', data);
      return state;
    }

    case ActionTypes.ADD_MAIL_CONFIGURATION_SUCCESS: {
      const {
        payload: { error },
      } = action;
      state = state.set('mail_configurations_error', error.message);
      return state;
    }

    case ActionTypes.DELETE_MAIL_CONFIGURATION_SUCCESS: {
      const {
        payload: { data },
      } = action;
      state = state.set('mail_configurations', data);
      return state;
    }

    case ActionTypes.GET_GLOBAL_SETTINGS_SUCCESS: {
      const {
        payload: { data },
      } = action;
      state = state.set('global_settings', data);
      return state;
    }

    case ActionTypes.SET_TOPOLOGY_GRAPH_API: {
      return state.set('topologyGraphAPI', action.api);
    }

    case ActionTypes.SHOW_TOPOLOGY_PANEL: {
      return state.set('showTopologyPanel', action.show);
    }

    case ActionTypes.SET_TOPOLOGY_PANEL_NAV_STACK: {
      return state.set('topologyPanelNavStack', action.stack);
    }

    case ActionTypes.ADD_TOPOLOGY_FILTER: {
      const api = state.get('topologyGraphAPI');
      const { filter } = action;
      const node_id = filter[filter.length - 1].id;
      setTimeout(() => api.expandNode(node_id), 0);
      return state;
    }

    case ActionTypes.REMOVE_TOPOLOGY_FILTER: {
      const api = state.get('topologyGraphAPI');
      const { filter } = action;
      const node_id = filter[filter.length - 1].id;
      setTimeout(() => api.collapseNode(node_id), 0);
      return state;
    }

    case ActionTypes.TOPOLOGY_FILTER_ADDED: {
      return state.update('topologyFilters', filters => filters.push(action.filter));
    }

    case ActionTypes.RESET_TOPOLOGY_FILTER: {
      return state.set('topologyFilters', makeList());
    }

    case ActionTypes.TOPOLOGY_FILTER_REMOVED: {
      const filterId = filter => filter[filter.length - 1].id;
      return state.update('topologyFilters', filters => filters.filterNot(
        filter => filterId(filter) === filterId(action.filter)
      ));
    }

    case ActionTypes.GET_TOP_ATTACK_PATHS_PER_NODE_REQUEST: {
      return state.setIn(['topAttackPathsForNode', 'status', 'loading'], true);
    }

    case ActionTypes.GET_TOP_ATTACK_PATHS_PER_NODE_SUCCESS: {
      const {
        payload: { data },
      } = action;
      state = state.setIn(['topAttackPathsForNode', 'status', 'loading'], false);
      return state.setIn(['topAttackPathsForNode', 'data'], data);
    }

    case ActionTypes.GET_TOP_ATTACK_PATHS_PER_NODE_FAILURE: {
      state = state.setIn(['topAttackPathsForNode', 'status', 'loading'], false);
      state = state.setIn(['topAttackPathsForNode', 'data'], null);
      return state.setIn(['topAttackPathsForNode', 'status', 'error'],
        'Your request to get top attack paths failed.');
    }

    case ActionTypes.GET_TOP_ATTACK_PATHS_PER_DOC_REQUEST: {
      return state.setIn(['topAttackPathsForDoc', 'status', 'loading'], true);
    }

    case ActionTypes.GET_TOP_ATTACK_PATHS_PER_DOC_SUCCESS: {
      const {
        payload: { data },
      } = action;
      state = state.setIn(['topAttackPathsForDoc', 'status', 'loading'], false);
      return state.setIn(['topAttackPathsForDoc', 'data'], data);
    }

    case ActionTypes.GET_TOP_ATTACK_PATHS_PER_DOC_FAILURE: {
      state = state.setIn(['topAttackPathsForDoc', 'status', 'loading'], false);
      state = state.setIn(['topAttackPathsForDoc', 'data'], null);
      return state.setIn(['topAttackPathsForDoc', 'status', 'error'],
        'Your request to get top attack paths failed.');
    }

    case ActionTypes.GET_TOP_VULNERABLE_ATTACK_PATHS_REQUEST: {
      return state.setIn(['topAttackPaths', 'status', 'loading'], true);
    }

    case ActionTypes.GET_TOP_VULNERABLE_ATTACK_PATHS_SUCCESS: {
      const {
        payload: { data },
      } = action;
      state = state.setIn(['topAttackPaths', 'status', 'loading'], false);
      return state.setIn(['topAttackPaths', 'data'], data);
    }

    case ActionTypes.GET_TOP_VULNERABLE_ATTACK_PATHS_FAILURE: {
      state = state.setIn(['topAttackPaths', 'status', 'loading'], false);
      state = state.setIn(['topAttackPaths', 'data'], null);
      return state.setIn(['topAttackPaths', 'status', 'error'],
        'Your request to get top attack paths failed.');
    }

    default: {
      // forwarding unknown action types to redux-form reducer.
      state = state.set('form', formReducer(state.get('form'), action));
      state = state.set('cve', CVEReducer(state.get('cve'), action));

      const dfTableMultiSelectColumnCurrentState = state.get(
        'df_table_multi_select_column'
      );
      state = state.set(
        'df_table_multi_select_column',
        DFTableMultiSelectColumnReducer(
          dfTableMultiSelectColumnCurrentState,
          action
        )
      );

      const reportDownloadReducerCurrentState = state.get('report_download');
      state = state.set(
        'report_download',
        ReportDownloadReducer(reportDownloadReducerCurrentState, action)
      );

      state = combineState(state, 'nodesView', nodesViewReducer, action);

      return state;
    }
  }
}

export default rootReducer;
