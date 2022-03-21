const ALERTS_TABLE_HEADERS = ['@timestamp', 'severity', 'intent', 'classtype', 'host', 'summary', 'action'];

const VULNERABILITY_TABLE_HEADERS = ['cve_id', 'cve_caused_by_package', 'cve_severity', 'cve_description', 'cve_link', 'action'];

const ALERT_TYPE = 'alert';
const ALERT_SEVERITY_KEY = 'severity';
const ALERT_SUMMARY_KEY = 'summary';

const VULNERABILITY_TYPE = 'cve';
const VULNERABILITY_SEVERITY_KEY = 'cve_severity';
const VULNERABILITY_SUMMARY_KEY = 'cve_description';

export function getAlertsTableHeader() {
  return ALERTS_TABLE_HEADERS;
}

export function getAlertsTableHeaderCompact() {
  return ALERTS_TABLE_HEADERS.filter(el => (el !== 'host' && el !== 'severity' && el !== 'action'));
}

export function getVulnerabilityHeaders() {
  return VULNERABILITY_TABLE_HEADERS;
}

export function getVulnerabilityHeadersCompact() {
  return VULNERABILITY_TABLE_HEADERS.filter(el => (el !== 'cve_severity' && el !== 'action'));
}

export function getSeverityByType(type) {
  let result;
  if (type === ALERT_TYPE) {
    result = ALERT_SEVERITY_KEY;
  } else if (type === VULNERABILITY_TYPE) {
    result = VULNERABILITY_SEVERITY_KEY;
  }
  return result;
}

export function getSummaryByType(type) {
  let result;
  if (type === ALERT_TYPE) {
    result = ALERT_SUMMARY_KEY;
  } else if (type === VULNERABILITY_TYPE) {
    result = VULNERABILITY_SUMMARY_KEY;
  }
  return result;
}

const severities = [
  'low',
  'medium',
  'high',
  'critical',
];
// return 1 if rowA is greater than rowB
export function severitySort(rowA, rowB, colId) {
  return severities.indexOf(rowA.original[colId]) > severities.indexOf(rowB.original[colId]) ? 1 : -1;
}
