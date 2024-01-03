import { colors } from 'tailwind-preset';

import { Mode } from '@/theme/ThemeContext';
import { PostureSeverityType } from '@/types/common';

export const getSeverityColorMap = (theme: Mode) => {
  const color = colors[theme === 'dark' ? 'variables' : 'darkVariables'].DEFAULT;

  if (theme === 'light') {
    return {
      critical: color['status-error'],
      high: color.chart.orange,
      medium: color['status-warning'],
      low: color.chart.yellow1,
      unknown: color['df-gray']['400'],
    };
  }

  return {
    critical: color['status-error'],
    high: color.chart.orange,
    medium: color['status-warning'],
    low: color.chart.yellow1,
    unknown: color['df-gray']['600'],
  };
};

// TODO: take theme into account
export function getColorForCVSSScore(score: number | undefined): string {
  if (!score) return colors.variables.DEFAULT['df-gray']['600'];
  if (score > 0 && score <= 3.9) return colors.variables.DEFAULT.chart.yellow1;
  if (score >= 4 && score <= 6.9) return colors.variables.DEFAULT['status-warning'];
  if (score >= 7 && score <= 8.9) return colors.variables.DEFAULT.chart.orange;
  if (score >= 9 && score <= 10) return colors.variables.DEFAULT['status-error'];
  return colors.variables.DEFAULT['df-gray']['600'];
}

export const getPostureColor = (theme: Mode) => {
  const color = colors[theme === 'dark' ? 'variables' : 'darkVariables'].DEFAULT;

  if (theme === 'light') {
    return {
      alarm: color['status-error'],
      info: color['status-info'],
      ok: color['status-success'],
      skip: color['df-gray']['400'],

      pass: color['status-success'],
      warn: color['status-warning'],
      note: color['df-gray']['400'],
      delete: color['status-error'],
    };
  }
  return {
    alarm: color['status-error'],
    info: color['status-info'],
    ok: color['status-success'],
    skip: color['df-gray']['600'],

    pass: color['status-success'],
    warn: color['status-warning'],
    note: color['df-gray']['600'],
    delete: color['status-error'],
  };
};

export function getColorForCompliancePercent(
  theme: Mode,
  percent: number | undefined | null,
): string {
  const color = colors[theme === 'dark' ? 'variables' : 'darkVariables'].DEFAULT;
  if (percent === undefined || percent === null) {
    return theme === 'dark' ? color['df-gray']['600'] : color['df-gray']['400'];
  }
  if (percent >= 80 && percent <= 100) {
    return color['status-success'];
  } else if (percent >= 30 && percent < 80) {
    return color['status-warning'];
  } else if (percent < 30) {
    return color['status-error'];
  }
  return theme === 'dark' ? color['df-gray']['600'] : color['df-gray']['400'];
}
