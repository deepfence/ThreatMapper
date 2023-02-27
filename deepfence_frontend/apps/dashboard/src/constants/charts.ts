import { VulnerabilitySeverityType } from '@/types/common';

export const VULNERABILITY_SEVERITY_COLORS: {
  [x in VulnerabilitySeverityType]: string;
} = {
  critical: '#de425b',
  high: '#f58055',
  medium: '#ffd577',
  low: '#d6e184',
  unknown: '#9CA3AF',
};
