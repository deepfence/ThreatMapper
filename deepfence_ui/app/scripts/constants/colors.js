/* eslint-disable max-len */

import dfStyle from '../../styles/_deepfence.scss';

export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  High: 'High',
  MEDIUM: 'medium',
  Medium: 'Medium',
  LOW: 'low',
  Low: 'Low',
  INFO: 'info',
};

export const sevColors = {
  critical: dfStyle.severityColorCritical,
  high: dfStyle.severityColorHigh,
  High: dfStyle.severityColorHigh,
  medium: dfStyle.severityColorMedium,
  Medium: dfStyle.severityColorMedium,
  low: dfStyle.severityColorLow,
  Low: dfStyle.severityColorLow,
  info: dfStyle.severityColorInfo,
  pass: dfStyle.passColor,
};

export const sevColorsShade = {
  critical: dfStyle.severityColorCriticalShade,
  high: dfStyle.severityColorHighShade,
  High: dfStyle.severityColorHighShade,
  medium: dfStyle.severityColorMediumShade,
  Medium: dfStyle.severityColorMediumShade,
  low: dfStyle.severityColorLowShade,
  Low: dfStyle.severityColorLowShade,
  info: dfStyle.severityColorInfoShade,
  pass: dfStyle.passColorShade,
};

export const complianceColors = {
  critical: dfStyle.severityColorCritical,
  high: dfStyle.severityColorHigh,
  medium: dfStyle.severityColorMedium,
  low: dfStyle.severityColorLow,
  warn: dfStyle.severityColorCritical,
  fail: dfStyle.severityColorCritical,
  note: dfStyle.severityColorMedium,
  error: dfStyle.severityColorMedium,
  info: dfStyle.severityColorLow,
  informational: dfStyle.severityColorLow,
  total: dfStyle.severityColorLow,
  scanned: dfStyle.severityColorHigh,
  pass: dfStyle.passColor,
};

export const complianceColorsShade = {
  critical: dfStyle.severityColorCriticalShade,
  high: dfStyle.severityColorHighShade,
  medium: dfStyle.severityColorMediumShade,
  low: dfStyle.severityColorLowShade,
  warn: dfStyle.severityColorCriticalShade,
  fail: dfStyle.severityColorCriticalShade,
  note: dfStyle.severityColorMediumShade,
  error: dfStyle.severityColorMediumShade,
  info: dfStyle.severityColorLowShade,
  informational: dfStyle.severityColorLowShade,
  total: dfStyle.severityColorLowShade,
  scanned: dfStyle.severityColorHighShade,
  pass: dfStyle.passColorShade,
};

export const severityColorsSunBurst = ({ path }) => {
  if (path.startsWith(SEVERITY.CRITICAL)) {
    return sevColors[SEVERITY.CRITICAL];
  } if (path.startsWith(SEVERITY.HIGH)) {
    return sevColors[SEVERITY.HIGH];
  }  if (path.startsWith(SEVERITY.High)) {
    return sevColors[SEVERITY.High];
  } if (path.startsWith(SEVERITY.MEDIUM)) {
    return sevColors[SEVERITY.MEDIUM];
  }  if (path.startsWith(SEVERITY.Medium)) {
    return sevColors[SEVERITY.Medium];
  } if (path.startsWith(SEVERITY.LOW)) {
    return sevColors[SEVERITY.LOW];
  } if (path.startsWith(SEVERITY.Low)) {
    return sevColors[SEVERITY.Low];
  }
  return sevColors[SEVERITY.INFO];
};

export const severityColorsCirclePacking = ({ path }) => {
  if (path.startsWith(SEVERITY.CRITICAL)) {
    return sevColors[SEVERITY.CRITICAL];
  } if (path.startsWith(SEVERITY.HIGH)) {
    return sevColors[SEVERITY.HIGH];
  } if (path.startsWith(SEVERITY.MEDIUM)) {
    return sevColors[SEVERITY.MEDIUM];
  } if (path.startsWith(SEVERITY.LOW)) {
    return sevColors[SEVERITY.LOW];
  }
  return dfStyle.cardBody;
};

export const severityColorsSunBurstShade = (path) => {
  if (path.startsWith(SEVERITY.CRITICAL)) {
    return sevColorsShade[SEVERITY.CRITICAL];
  } if (path.startsWith(SEVERITY.HIGH)) {
    return sevColorsShade[SEVERITY.HIGH];
  }  if (path.startsWith(SEVERITY.High)) {
    return sevColorsShade[SEVERITY.High];
  } if (path.startsWith(SEVERITY.MEDIUM)) {
    return sevColorsShade[SEVERITY.MEDIUM];
  }  if (path.startsWith(SEVERITY.Medium)) {
    return sevColorsShade[SEVERITY.Medium];
  } if (path.startsWith(SEVERITY.LOW)) {
    return sevColorsShade[SEVERITY.LOW];
  } if (path.startsWith(SEVERITY.Low)) {
    return sevColorsShade[SEVERITY.Low];
  }
  return sevColorsShade[SEVERITY.INFO];
};

export const getComplianceColor = key => complianceColors[key.toLowerCase()] || complianceColors.info;
export const getComplianceColorActive = key => complianceColorsShade[key.toLowerCase()] || complianceColorsShade.info;

export const getSeverityColor = (key, active) => {
  if (active) {
    return sevColorsShade[key.toLowerCase()] || sevColorsShade.info;
  }
  return sevColors[key.toLowerCase()] || sevColors.info;
};
