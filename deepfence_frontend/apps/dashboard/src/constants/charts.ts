import { PostureSeverityType, VulnerabilitySeverityType } from '@/types/common';

export const SEVERITY_COLORS: {
  [x in VulnerabilitySeverityType]: string;
} = {
  critical: '#de425b',
  high: '#ee7750',
  medium: '#f1a958',
  low: '#edd777',
  unknown: '#9CA3AF',
};

export const POSTURE_STATUS_COLORS: {
  [x in PostureSeverityType]: string;
} = {
  alarm: '#de425b',
  info: '#3F83F8',
  ok: '#488f31',
  skip: '#9CA3AF',

  pass: '#488f31',
  warn: '#f1a958',
  note: '#edd777',
};
