/* eslint-disable import/named */
/* eslint-disable no-restricted-globals */
/* eslint-disable import/no-cycle */
import { storageGet, storageSet } from './storage-utils';

//
// page.js won't match the routes below if ":state" has a slash in it, so replace those before we
// load the state into the URL.
//
const SLASH = '/';
const SLASH_REPLACEMENT = '<SLASH>';
const PERCENT = '%';
const PERCENT_REPLACEMENT = '<PERCENT>';
const STORAGE_STATE_KEY = 'scopeViewState';

function encodeURL(url) {
  return url
    .replace(new RegExp(PERCENT, 'g'), PERCENT_REPLACEMENT)
    .replace(new RegExp(SLASH, 'g'), SLASH_REPLACEMENT);
}

export function decodeURL(url) {
  return decodeURIComponent(url.replace(new RegExp(SLASH_REPLACEMENT, 'g'), SLASH))
    .replace(new RegExp(PERCENT_REPLACEMENT, 'g'), PERCENT);
}

export function parseHashState(hash = storageGet('scopePreviousState')) {
  const urlStateString = hash
    .replace('#!/state/', '')
    .replace('#!/', '') || '{}';
  return JSON.parse(decodeURL(urlStateString));
}

function shouldReplaceState(prevState, nextState) {
  // Opening a new terminal while an existing one is open.
  const terminalToTerminal = (prevState.controlPipe && nextState.controlPipe);
  // Closing a terminal.
  const closingTheTerminal = (prevState.controlPipe && !nextState.controlPipe);

  return terminalToTerminal || closingTheTerminal;
}

export function getUrlState(state) {
  const cp = state.get('controlPipes').last();
  const nodeDetails = state.get('nodeDetails').toIndexedSeq().map(details => ({
    id: details.id, label: details.label, topologyId: details.topologyId
  }));

  const urlState = {
    controlPipe: cp ? cp.toJS() : null,
    nodeDetails: nodeDetails.toJS(),
    topologyViewMode: state.get('topologyViewMode'),
    pinnedMetricType: state.get('pinnedMetricType'),
    pinnedSearches: state.get('pinnedSearches').toJS(),
    searchQuery: state.get('searchQuery'),
    selectedNodeId: state.get('selectedNodeId'),
    gridSortedBy: state.get('gridSortedBy'),
    gridSortedDesc: state.get('gridSortedDesc'),
    topologyId: state.get('currentTopologyId'),
    topologyOptions: state.get('topologyOptions').toJS(), // all options,
    contrastMode: state.get('contrastMode')
  };

  if (state.get('showingNetworks')) {
    urlState.showingNetworks = true;
    if (state.get('pinnedNetwork')) {
      urlState.pinnedNetwork = state.get('pinnedNetwork');
    }
  }

  // Setting up scope view previous state.
  localStorage.setItem('scopePreviousState', storageGet('scopeViewState'));

  return urlState;
}

export function updateRoute(getState) {
  // Setting scope previous state to local storage
  const state = getUrlState(getState());
  const stateUrl = encodeURL(JSON.stringify(state));
  // const dispatch = false;
  const prevState = parseHashState();

  // back up state in storage as well
  storageSet(STORAGE_STATE_KEY, stateUrl);

  if (shouldReplaceState(prevState, state)) {
    // Replace the top of the history rather than pushing on a new item.
    // page.replace(`/state/${stateUrl}`, state, dispatch);
  } else {
    // page.show(`/state/${stateUrl}`, state, dispatch);
  }
}


export function enableDashboardAccess() {
  parent.location.hash = 'topology';
}

export function disableDashboardAccess() {
  parent.location.hash = 'login';
}
