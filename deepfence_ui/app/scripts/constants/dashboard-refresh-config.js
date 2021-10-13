export const TIME_BOUNDARY_OPTIONS = [
  { label: 'Last 15 minutes', value: { number: 15, time_unit: 'minute' } },
  { label: 'Last 30 minutes', value: { number: 30, time_unit: 'minute' } },
  { label: 'Last 1 hour', value: { number: 1, time_unit: 'hour' } },
  { label: 'Last 4 hours', value: { number: 4, time_unit: 'hour'} },
  { label: 'Last 12 hours', value: { number: 12, time_unit: 'hour' } },
  { label: 'Last 24 hours', value: { number: 24, time_unit: 'hour' } },
  { label: 'Last 7 days', value: { number: 7, time_unit: 'day' } },
  { label: 'Last 30 days', value: { number: 30, time_unit: 'day' } },
  { label: 'Last 60 days', value: { number: 60, time_unit: 'day' } },
  { label: 'Last 90 days', value: { number: 90, time_unit: 'day' } },
  { label: 'Last 6 months', value: { number: 6, time_unit: 'month' } },
  { label: 'Show all', value: { number: 0, time_unit: 'all' } }
];

export const REFRESH_INTERVALS_OPTIONS = [
  { label: '5 seconds', value: 5},
  { label: '10 seconds', value: 10},
  { label: '30 seconds', value: 30},
  { label: '45 seconds', value: 45},
  { label: '1 minute', value: 60},
  { label: '5 minutes', value: 5 * 60},
  { label: '15 minutes', value: 15 * 60},
  { label: '30 minutes', value: 30 * 60},
  { label: '1 hour', value: 1 * 60 * 60},
  { label: '2 hour', value: 2 * 60 * 60},
  { label: '12 hour', value: 12 * 60 * 60},
  { label: '1 day', value: 24 * 60 * 60}
];
