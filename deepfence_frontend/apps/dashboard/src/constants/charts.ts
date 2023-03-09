import { PostureSeverityType, VulnerabilitySeverityType } from '@/types/common';

export const SEVERITY_COLORS: {
  [x in VulnerabilitySeverityType]: string;
} = {
  critical: '#de425b',
  high: '#f58055',
  medium: '#ffd577',
  low: '#d6e184',
  unknown: '#9CA3AF',
};

export const POSTURE_SEVERITY_COLORS: {
  [x in PostureSeverityType]: string;
} = {
  alarm: '#F05252',
  info: '#3F83F8',
  ok: '#0E9F6E',
  skip: '#6B7280',
};
