/* eslint-disable no-restricted-globals */
export function enableDashboardAccess() {
  parent.location.hash = 'topology';
}

export function disableDashboardAccess() {
  parent.location.hash = 'login';
}
