export const POLICY_ACTION_DROPDOWN = {
  heading: 'choose action',
  options: [
    {id: 1, display: 'Restart', value: 'restart'},
    {id: 2, display: 'Stop', value: 'stop'},
    {id: 3, display: 'Pause', value: 'pause'}
  ]
};

export const NODE_TYPE_DROPDOWN = {
  heading: 'choose node type',
  options: [
    {id: 1, display: 'Container', value: 'container'},
    {id: 3, display: 'Pod', value: 'pod'}
  ]
};

export const ALERT_TYPE_RADIO_BUTTON_COLLECTION = {
  heading: '',
  options: [
    {name: 'Critical', value: 'critical'},
    {name: 'High', value: 'high'},
    {name: 'Medium', value: 'medium'},
    {name: 'Low', value: 'low'}
  ]
};

export const CLOUD_PROVIDER_DROP_DOWN_COLLECTION = {
  heading: '',
  options: [
    {id: 1, name: 'Aws', value: 'aws'},
    {id: 2, name: 'Google Cloud', value: 'gce'},
    {id: 3, name: 'Azure', value: 'azure'}
  ]
};

export const DURATION_DROPDOWN_COLLECTION = {
  heading: 'Select Interval',
  options: [
    {
      id: 1, value: '-1', time_unit: 'minute', display: 'immediate'
    },
    {
      id: 2, value: '5', time_unit: 'minute', display: 'every 5 minute'
    },
    {
      id: 3, value: '15', time_unit: 'minute', display: 'every 15 minute'
    },
    {
      id: 4, value: '30', time_unit: 'minute', display: 'every 30 minute'
    },
    {
      id: 5, value: '60', time_unit: 'minute', display: 'every 60 minute'
    }

  ]
};

export const NOTIFICATION_RESOURCE_OPTIONS = [
  {
    label: 'Vulnerabilities',
    value: 'vulnerability',
  },
  {
    label: 'Compliance Results',
    value: 'compliance',
  },
  {
    label: 'User Activities',
    value: 'user_activity',
  },
];
