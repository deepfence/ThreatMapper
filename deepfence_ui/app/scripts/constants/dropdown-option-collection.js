export const POLICY_ACTION_DROPDOWN = {
  heading: 'choose action',
  options: [
    { id: 1, display: 'Restart', value: 'restart' },
    { id: 2, display: 'Stop', value: 'stop' },
    { id: 3, display: 'Pause', value: 'pause' },
  ],
};

export const NODE_TYPE_DROPDOWN = {
  heading: 'choose node type',
  options: [
    { id: 1, display: 'Container', value: 'container' },
    { id: 3, display: 'Pod', value: 'pod' },
  ],
};

export const ALERT_TYPE_RADIO_BUTTON_COLLECTION = {
  heading: '',
  options: [
    { name: 'Critical', value: 'critical' },
    { name: 'High', value: 'high' },
    { name: 'Medium', value: 'medium' },
    { name: 'Low', value: 'low' },
  ],
};

export const CLOUD_PROVIDER_DROP_DOWN_COLLECTION = {
  heading: '',
  options: [
    { id: 1, name: 'Aws', value: 'aws' },
    { id: 2, name: 'Google Cloud', value: 'gce' },
    { id: 3, name: 'Azure', value: 'azure' },
  ],
};

export const DURATION_DROPDOWN_COLLECTION = {
  heading: 'Select Interval',
  options: [
    {
      id: 1,
      value: '-1',
      time_unit: 'minute',
      display: 'immediate',
    },
    {
      id: 2,
      value: '5',
      time_unit: 'minute',
      display: 'every 5 minute',
    },
    {
      id: 3,
      value: '15',
      time_unit: 'minute',
      display: 'every 15 minute',
    },
    {
      id: 4,
      value: '30',
      time_unit: 'minute',
      display: 'every 30 minute',
    },
    {
      id: 5,
      value: '60',
      time_unit: 'minute',
      display: 'every 60 minute',
    },
  ],
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

export const NOTIFICATION_RESOURCE_OPTIONS_CLOUDTRAIL = [
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
  {
    label: 'CloudTrail Alerts',
    value: 'cloudtrail_alert',
  },
];

export const REGION_OPTIONS = {
  heading: 'Select Region',
  options: [
    {
      value: 'us-east-1',
      label: 'us-east-1',
    },
    {
      value: 'us-east-2',
      label: 'us-east-2',
    },
    {
      value: 'us-west-1',
      label: 'us-west-1',
    },
    {
      value: 'us-west-2',
      label: 'us-west-2',
    },
    {
      value: 'af-south-1',
      label: 'af-south-1',
    },
    {
      value: 'ap-east-1',
      label: 'ap-east-1',
    },
    {
      value: 'ap-south-1',
      label: 'ap-south-1',
    },
    {
      value: 'ap-northeast-1',
      label: 'ap-northeast-1',
    },
    {
      value: 'ap-northeast-2',
      label: 'ap-northeast-2',
    },
    {
      value: 'ap-northeast-3',
      label: 'ap-northeast-3',
    },
    {
      value: 'ap-southeast-1',
      label: 'ap-southeast-1',
    },
    {
      value: 'ap-southeast-2',
      label: 'ap-southeast-2',
    },
    {
      value: 'ap-southeast-3',
      label: 'ap-southeast-3',
    },
    {
      value: 'ca-central-1',
      label: 'ca-central-1',
    },
    {
      value: 'eu-central-1',
      label: 'eu-central-1',
    },
    {
      value: 'eu-west-1',
      label: 'eu-west-1',
    },
    {
      value: 'eu-west-2',
      label: 'eu-west-2',
    },
    {
      value: 'eu-west-3',
      label: 'eu-west-3',
    },
    {
      value: 'eu-south-1',
      label: 'eu-south-1',
    },
    {
      value: 'eu-north-1',
      label: 'eu-north-1',
    },
    {
      value: 'me-south-1',
      label: 'me-south-1',
    },
    {
      value: 'me-central-1',
      label: 'me-central-1',
    },
    {
      value: 'sa-east-1',
      label: 'sa-east-1',
    },
    {
      value: 'us-gov-east-1',
      label: 'us-gov-east-1',
    },
    {
      value: 'us-gov-west-1',
      label: 'us-gov-west-1',
    },
  ],
};
