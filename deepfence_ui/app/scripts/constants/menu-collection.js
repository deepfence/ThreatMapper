import SLACK_LOGO from '../../images/slack.png';
import EMAIL_LOGO from '../../images/email-icon.png';
import PAGER_DUTY_LOGO from '../../images/pager-duty.jpg';
import SPLUNK_LOGO from '../../images/splunk-logo.png';
import ELASTICSEARCH_LOGO from '../../images/elasticsearch-logo.png';
import AWS_S3_LOGO from '../../images/aws-s3-logo.png';
import JIRA_LOGO from '../../images/jira.png';
import SUMO_LOGIC_LOGO from '../../images/sumo-logic.png';
import XLSX_LOGO from '../../images/xls.png';
import HTTP_LOGO from '../../images/http.png';
import GOOGLE_CHRONICLE_LOGO from '../../images/google-chronicle.png';
import PDF_LOGO from '../../images/pdf-logo.png';
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
    name: 'xlsx', isActive: true, icon: XLSX_LOGO, displayName: 'XLSX', category: 'report', bgcolor: '#C5FFB3', parent: 'Reports'
  },
  {
    name: 'pdf', isActive: true, icon: PDF_LOGO, displayName: 'PDF', category: 'report', bgcolor: '#FFFFFF', parent: 'Reports'
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
    name: 'Vulnerabilities', menuIcon: 'icon-biohazard', isActive: false, link: '/vulnerability'
  },
  {
    name: 'Registries', menuIcon: 'icon-containers', isActive: false, link: '/registry_vulnerability_scan'
  },
  {
    name: 'Integrations', menuIcon: 'icon-notification', isActive: false, link: '/notification'
  },
  {
    name: 'Settings', menuIcon: 'icon-settings', isActive: false, link: '/settings'
  },
];

export const USER_SIDE_NAV_MENU_COLLECTION = [
  {
    name: 'Topology', menuIcon: 'icon-Topology', isActive: true, link: '/topology'
  },
  {
    name: 'Vulnerabilities', menuIcon: 'icon-biohazard', isActive: false, link: '/vulnerability'
  },
  {
    name: 'Registries', menuIcon: 'icon-containers', isActive: false, link: '/registry_vulnerability_scan'
  },
  {
    name: 'Integrations', menuIcon: 'icon-notification', isActive: false, link: '/notification'
  },
  {
    name: 'Settings', menuIcon: 'icon-settings', isActive: false, link: '/settings'
  },
];

export const ADMIN_SETTINGS_MENU_COLLECTION = [
  {name: 'scheduled_jobs', isActive: false},
  {name: 'user_management', isActive: false},
  {name: 'alerts_&_logs_management', isActive: false},
  {name: 'diagnosis', isActive: false},
  {name: 'user_audit_logs', isActive: false},
  {name: 'email_configuration', isActive: false},
  {name: 'global_settings', isActive: false}
];

export const USER_SETTINGS_MUNU_COLLECTION = [
  {name: 'scheduled_jobs', isActive: false},
  {name: 'user_management', isActive: false}
];

export const CVE_SCAN_TYPE_OPTIONS = [
  {
    value: 'java',
    label: 'Java',
  },
  {
    value: 'js',
    label: 'Javascript',
  },
  {
    value: 'nodejs',
    label: 'NodeJS',
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
