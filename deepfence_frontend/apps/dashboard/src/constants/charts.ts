import { preset } from 'tailwind-preset';

import { PostureSeverityType, VulnerabilitySeverityType } from '@/types/common';

export const SEVERITY_COLORS: {
  [x in VulnerabilitySeverityType]: string;
} = {
  critical: preset.theme.extend.colors.status.error,
  high: preset.theme.extend.colors.chart.orange,
  medium: preset.theme.extend.colors.status.warning,
  low: preset.theme.extend.colors.chart.yellow1,
  unknown: preset.theme.extend.colors['df-gray'][600],
};

export function getColorForCVSSScore(score: number | undefined): string {
  if (!score) return preset.theme.extend.colors['df-gray'][600];
  if (score > 0 && score <= 3.9) return preset.theme.extend.colors.chart.yellow1;
  if (score >= 4 && score <= 6.9) return preset.theme.extend.colors.status.warning;
  if (score >= 7 && score <= 8.9) return preset.theme.extend.colors.chart.orange;
  if (score >= 9 && score <= 10) return preset.theme.extend.colors.status.error;
  return preset.theme.extend.colors['df-gray'][600];
}

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
