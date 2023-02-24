import { VulnerabilitySeverityType } from '@/types/common';

export const VULNERABILITY_SEVERITY_COLORS: {
  [x in VulnerabilitySeverityType]: string;
} = {
  critical: '#ff4570',
  high: '#f90',
  medium: '#F8CD39',
  low: '#9CA3AF',
  unknown: '#9CA3AF',
};
