import SLACK_LOGO from '../../images/slack.png';
import EMAIL_LOGO from '../../images/email-icon.png';
import PAGER_DUTY_LOGO from '../../images/pager-duty.jpg';
import SPLUNK_LOGO from '../../images/splunk-logo.png';
import ELASTICSEARCH_LOGO from '../../images/elasticsearch-logo.png';
import AWS_S3_LOGO from '../../images/aws-s3-logo.png';
import JIRA_LOGO from '../../images/jira.png';
import SUMO_LOGIC_LOGO from '../../images/sumo-logic.png';
import HTTP_LOGO from '../../images/http.png';
import GOOGLE_CHRONICLE_LOGO from '../../images/google-chronicle.png';
import REPORTS from '../../images/reports.png';
import MICROSOFT_LOGO from '../../images/microsoft-teams.png';

export const INTEGRATION_MENU_COLLECTION = [
  {
    name: 'slack', isActive: false, icon: SLACK_LOGO, displayName: 'Slack', category: 'notification', bgcolor: '#0E0E0E', parent: 'Notification'
  },
  {
    name: 'pagerduty', isActive: false, icon: PAGER_DUTY_LOGO, displayName: 'Pager Duty', category: 'notification', bgcolor: '#04AB38', parent: 'Notification'
  },
  {
    name: 'email', isActive: true, icon: EMAIL_LOGO, displayName: 'Email', category: 'notification', bgcolor: '#A6CDFF', parent: 'Notification'
  },
  {
    name: 'splunk', isActive: true, icon: SPLUNK_LOGO, displayName: 'Splunk', category: 'siem', bgcolor: '#70ac4c', parent: 'SIEM'
  },
  {
    name: 'elasticsearch', isActive: true, icon: ELASTICSEARCH_LOGO, displayName: 'Elasticsearch', category: 'siem', bgcolor: 'black', parent: 'SIEM'
  },
  {
    name: 's3', isActive: true, icon: AWS_S3_LOGO, displayName: 'S3', category: 'archival', parent: 'Archival'
  },
  {
    name: 'http_endpoint', isActive: true, icon: HTTP_LOGO, displayName: 'HTTP endpoint', category: 'notification', bgcolor: 'white', parent: 'Notification'
  },
  {
    name: 'jira', isActive: false, icon: JIRA_LOGO, displayName: 'Jira', category: 'ticketing', bgcolor: '#A6CDFF', parent: 'Ticketing'
  },
  {
    name: 'sumo_logic', isActive: true, icon: SUMO_LOGIC_LOGO, displayName: 'Sumo Logic', category: 'siem', bgcolor: 'black', parent: 'SIEM'
  },
  {
    name: 'google_chronicle', isActive: true, icon: GOOGLE_CHRONICLE_LOGO, displayName: 'Google Chronicle', category: 'siem', bgcolor: 'white', parent: 'SIEM'
  },
  {
    name: 'reports', isActive: true, icon: REPORTS, displayName: 'PDF/XLSX', category: 'report', bgcolor: '#7ec359', parent: 'Reports'
  },
  {
    name: 'microsoft_teams', isActive: false, icon: MICROSOFT_LOGO, displayName: 'Microsoft Teams', category: 'notification', bgcolor: '#0E0E0E', parent: 'Notification'
  },
];

export const ADMIN_SIDE_NAV_MENU_COLLECTION = [
  {
    name: 'Topology', menuIcon: 'icon-Topology', isActive: true, link: '/topology'
  },
  {
    name: 'Threat Graph', menuIcon: 'nav-icon-attack-graph', isActive: true, link: '/threat-graph'
  },
  {
    name: 'Vulnerabilities', menuIcon: 'icon-biohazard', isActive: false, link: '/vulnerability'
  },
  {
    name: 'Secrets', menuIcon: "nav-icon-secret", isActive: false, link: '/secret-scan'
  },
  {
    name: 'Posture', menuIcon: 'icon-compliance', isActive: false, link: '/compliance'
  },
  {
    name: 'Registries', menuIcon: 'icon-containers', isActive: false, link: '/registry_vulnerability_scan'
  },
  {
    name: 'Integrations', menuIcon: 'icon-notification', isActive: false, link: '/notification'
  },
];

export const USER_SIDE_NAV_MENU_COLLECTION = [
  {
    name: 'Topology', menuIcon: 'icon-Topology', isActive: true, link: '/topology'
  },
  {
    name: 'Threat Graph', menuIcon: 'nav-icon-attack-graph', isActive: true, link: '/threat-graph'
  },
  {
    name: 'Vulnerabilities', menuIcon: 'icon-biohazard', isActive: false, link: '/vulnerability'
  },
  {
    name: 'Secrets', menuIcon: "nav-icon-secret", isActive: false, link: '/secret-scan'
  },
  {
    name: 'Posture', menuIcon: 'icon-compliance', isActive: false, link: '/compliance'
  },
  {
    name: 'Registries', menuIcon: 'icon-containers', isActive: false, link: '/registry_vulnerability_scan'
  },
  {
    name: 'Integrations', menuIcon: 'icon-notification', isActive: false, link: '/notification'
  },
];

export const ADMIN_SETTINGS_MENU_COLLECTION = [
  {name: 'agent_setup', isActive: false},
  {name: 'scheduled_jobs', isActive: false},
  {name: 'user_management', isActive: false},
  {name: 'alerts_&_logs_management', isActive: false},
  {name: 'diagnosis', isActive: false},
  {name: 'user_audit_logs', isActive: false},
  {name: 'email_configuration', isActive: false},
  {name: 'global_settings', isActive: false}
];

export const USER_SETTINGS_MUNU_COLLECTION = [
  {name: 'agent_setup', isActive: false},
  {name: 'scheduled_jobs', isActive: false},
  {name: 'user_management', isActive: false}
];

export const CVE_SCAN_TYPE_OPTIONS = [
  {
    value: 'java',
    label: 'Java',
  },
  {
    value: 'javascript',
    label: 'Javascript',
  },
  {
    value: 'rust',
    label: 'Rust',
  },
  {
    value: 'golang',
    label: 'GoLang',
  },
  {
    value: 'ruby',
    label: 'Ruby',
  },
  {
    value: 'python',
    label: 'Python',
  },
  {
    value: 'php',
    label: 'PHP',
  },
  {
    value: 'dotnet',
    label: 'Dotnet',
  },
];
