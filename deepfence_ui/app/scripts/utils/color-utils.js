/*eslint-disable*/

import {
  BEHAVIORAL_ANOMALY, CRITICAL_ALERT, DEFAULT, HIGH_ALERT, LOW_ALERT, MEDIUM_ALERT, INFO_ALERT
} from '../constants/alert-types';
import {
  BEHAVIORAL_ANOMALY_CHECKBOX, BEHAVIORAL_ANOMALY_CLASS, CRITICAL_SEVERITY,
  CRITICAL_SEVERITY_CHECKBOX, CRITICAL_SEVERITY_CLASS, FILES_RESOURCE,
  HIGH_SEVERITY, HIGH_SEVERITY_CHECKBOX, HIGH_SEVERITY_CLASS, LOW_SEVERITY, INFO_SEVERITY, INFO_SEVERITY_CLASS,
  LOW_SEVERITY_CHECKBOX, LOW_SEVERITY_CLASS, MEDIUM_SEVERITY,
  MEDIUM_SEVERITY_CHECKBOX, MEDIUM_SEVERITY_CLASS, NETWORK_ANOMALY, NETWORK_ANOMALY_CHECKBOX,
  NETWORK_RESOURCE, PROCESSES_RESOURCE, SYSCALL_ANOMALY, SYSCALL_ANOMALY_CHECKBOX,
  SYSTEM_AUDIT, SYSTEM_AUDIT_ANOMALY_CHECKBOX, FILE_ANOMALY, PROCESS_ANOMALY, SE_LINUX_ANOMALY, CONNECTION_ANOMALY, CORRELATION_ANOMALY
} from '../constants/naming';

const PSEUDO_COLOR = '#b1b1cb';

export const colorCode = {
  BLUE: '#101010', //'rgba(0, 128, 255, 1)',
  BLUE_OPAQUE: 'rgba(0, 128, 255, 0.9)',
  LIGHT_ORANGE: '#101010', //'rgba(255, 153, 0, 1)', // lines
  LIGHT_ORANGE_OPAQUE: 'rgba(255, 153, 0, 0.9)',
  YELLOW: '#101010', //'#101010', //'rgba(248, 203, 57, 1)',
  YELLOW_OPAQUE: 'rgba(248, 203, 57, 0.9)',
  RED: '#101010', // 'rgba(255, 69, 112, 1)',
  RED_OPAQUE: 'rgba(255, 69, 112, 0.9)',
  ORANGE: '#F55D3E',
  ORANGE_OPAQUE: '#753328',
  GREY: '#6D7A82',
  GREY_OPAQUE: '#393E41',
  PALE_YELLOW: '#E7C663',
  PALE_YELLOW_OPAQUE: '#9C7F2A',
  VIOLET: '#8024B1',
  VIOLET_OPAQUE: '#3C1253',
  GREEN: '#6CCF3F',
  GREEN_OPAQUE: '#537A27',
}

/* START :: DONUT SECTOR COLORS */

const CRITICAL_ALERT_COLOR = '#FF456F';
const HIGH_ALERT_COLOR = '#FF9700';
const MEDIUM_ALERT_COLOR = '#F8CD39';
const LOW_ALERT_COLOR = '#0080FF';

// TYPES
const NETWORK_ANAMOLY_COLOR = '#0276c9';
const BEHAVIORAL_ANOMALY_COLOR = '#db2547';
const RESPONSE_ANAMOLY_COLOR = '#db2547';
const SYSTEM_AUDIT_COLOR = '#e7d036';
const SYSCALL_ANOMALY_COLOR = '#e08a25';

// DEFAULT
const DEFAULT_COLOR = '#ffffff';
const DUMMY_BUBBLE_COLOR = 'rgba(127, 126, 126, 0.3)';

/* OPACITY :: 30% */
const DONUT_CRITICAL_SECTOR_BACKGROUND = '#580b1d';
const DONUT_HIGH_SECTOR_BACKGROUND = '#58350b';
const DONUT_MEDIUM_SECTOR_BACKGROUND = '#58481c';
const DONUT_LOW_SECTOR_BACKGROUND = '#0b3e58';
const DONUT_RESPONSE_ANOMALY_SECTOR_BACKGROUND = '#58481c';
const DONUT_NETWORK_ANOMALY_SECTOR_BACKGROUND = '#0b3e58';
const DONUT_BEHAVIORAL_ANOMALY_SECTOR_BACKGROUND = '#580b1d';
/* END :: DONUT SECTOR COLORS */


/* START :: SEVERITY BASED NODE COLORS */
const NODE_CRITICAL_BACKGROUND_COLOR = '#560518';
const NODE_HIGH_BACKGROUND_COLOR = '#57310a';
const NODE_MEDIUM_BACKGROUND_COLOR = '#57461a';
const NODE_LOW_BACKGROUND_COLOR = '#083c56';
const NODE_DEFAULT_BACKGROUND_COLOR = '#5e5c64ff';
/* END :: SEVERITY BASED NODE COLORS */

// map hues to lightness
const startLetterRange = 'A'.charCodeAt();
const endLetterRange = 'Z'.charCodeAt();
const letterRange = endLetterRange - startLetterRange;

/**
 * Converts a text to a 360 degree value
 */

export function getNeutralColor() {
  return PSEUDO_COLOR;
}

export function getNodeColor(text = '', secondText = '', isPseudo = false) {
  if (isPseudo) {
    return PSEUDO_COLOR;
  }
  return colors(text, secondText).toString();
}

export function getSectorStrokeColor(sectorName) {
  switch (sectorName) {
    case CRITICAL_ALERT: {
      return CRITICAL_ALERT_COLOR;
    }
    case HIGH_ALERT: {
      return HIGH_ALERT_COLOR;
    }
    case MEDIUM_ALERT: {
      return MEDIUM_ALERT_COLOR;
    }
    case LOW_ALERT: {
      return LOW_ALERT_COLOR;
    }
    case INFO_ALERT: {
      return colorCode.GREY;
    }
    case NETWORK_ANOMALY: {
      return NETWORK_ANAMOLY_COLOR;
    }
    case BEHAVIORAL_ANOMALY: {
      return BEHAVIORAL_ANOMALY_COLOR;
    }
    case SYSTEM_AUDIT: {
      return SYSTEM_AUDIT_COLOR;
    }
    case SYSCALL_ANOMALY: {
      return SYSCALL_ANOMALY_COLOR;
    }
    case PROCESSES_RESOURCE: {
      return CRITICAL_ALERT_COLOR;
    }
    case FILES_RESOURCE: {
      return HIGH_ALERT_COLOR;
    }
    case NETWORK_RESOURCE: {
      return LOW_ALERT_COLOR;
    }
    case DEFAULT: {
      return DEFAULT_COLOR;
    }
    default: {
      return DEFAULT_COLOR;
    }
  }
}

export function getSectorHoveredColor(sectorName) {
  switch (sectorName) {
    case CRITICAL_ALERT: {
      return 'rgba(219, 37, 71, 0.35)';
    }
    case HIGH_ALERT: {
      return 'rgba(224, 138, 37, 0.35)';
    }
    case MEDIUM_ALERT: {
      return 'rgba(231, 208, 54, 0.35)';
    }
    case LOW_ALERT: {
      return 'rgba(2, 118, 201, 0.35)';
    }
    case INFO_ALERT: {
      return colorCode.GREY_OPAQUE;
    }
    case NETWORK_ANOMALY: {
      return 'rgba(2, 118, 201, 0.35)';
    }
    case BEHAVIORAL_ANOMALY: {
      return 'rgba(219, 37, 71, 0.35)';
    }
    case SYSTEM_AUDIT: {
      return 'rgba(231, 208, 54, 0.35)';
    }
    case SYSCALL_ANOMALY: {
      return 'rgba(224, 138, 37, 0.35)';
    }
    case PROCESSES_RESOURCE: {
      return 'rgba(219, 37, 71, 0.35)';
    }
    case FILES_RESOURCE: {
      return 'rgba(224, 138, 37, 0.35)';
    }
    case NETWORK_RESOURCE: {
      return 'rgba(2, 118, 201, 0.35)';
    }
    default: {
      return DEFAULT_COLOR;
    }
  }
}

export function getSectorBackgroundColor(type) {
  switch (type) {
    case CRITICAL_ALERT: {
      return DONUT_CRITICAL_SECTOR_BACKGROUND;
    }
    case HIGH_ALERT: {
      return DONUT_HIGH_SECTOR_BACKGROUND;
    }
    case MEDIUM_ALERT: {
      return DONUT_MEDIUM_SECTOR_BACKGROUND;
    }
    case LOW_ALERT: {
      return DONUT_LOW_SECTOR_BACKGROUND;
    }
    case INFO_ALERT: {
      return colorCode.GREY_OPAQUE;
    }
    // case RESPONSE_ANOMALY: {
    //   return DONUT_RESPONSE_ANOMALY_SECTOR_BACKGROUND;
    // }
    case NETWORK_ANOMALY: {
      return DONUT_NETWORK_ANOMALY_SECTOR_BACKGROUND;
    }
    case BEHAVIORAL_ANOMALY: {
      return DONUT_BEHAVIORAL_ANOMALY_SECTOR_BACKGROUND;
    }
    case SYSTEM_AUDIT: {
      return DONUT_MEDIUM_SECTOR_BACKGROUND;
    }
    case SYSCALL_ANOMALY: {
      return DONUT_HIGH_SECTOR_BACKGROUND;
    }
    case PROCESSES_RESOURCE: {
      return DONUT_CRITICAL_SECTOR_BACKGROUND;
    }
    case FILES_RESOURCE: {
      return DONUT_HIGH_SECTOR_BACKGROUND;
    }
    case NETWORK_RESOURCE: {
      return DONUT_LOW_SECTOR_BACKGROUND;
    }
    case DEFAULT: {
      return DUMMY_BUBBLE_COLOR;
    }
    default: {
      return DEFAULT_COLOR;
    }
  }
}

export function getLabelColour(type) {
  switch (type) {
    case CRITICAL_SEVERITY: {
      return CRITICAL_SEVERITY_CHECKBOX;
    }
    case HIGH_SEVERITY: {
      return HIGH_SEVERITY_CHECKBOX;
    }
    case MEDIUM_SEVERITY: {
      return MEDIUM_SEVERITY_CHECKBOX;
    }
    case LOW_SEVERITY: {
      return LOW_SEVERITY_CHECKBOX;
    }
    case NETWORK_ANOMALY: {
      return NETWORK_ANOMALY_CHECKBOX;
    }
    case BEHAVIORAL_ANOMALY: {
      return BEHAVIORAL_ANOMALY_CHECKBOX;
    }
    case SYSTEM_AUDIT: {
      return SYSTEM_AUDIT_ANOMALY_CHECKBOX;
    }
    case SYSCALL_ANOMALY: {
      return SYSCALL_ANOMALY_CHECKBOX;
    }
    default: {
      return DEFAULT_COLOR;
    }
  }
}

export function getTableCellStyles(type) {
  switch (type) {
    case CRITICAL_SEVERITY: {
      return CRITICAL_SEVERITY_CLASS;
    }
    case HIGH_SEVERITY: {
      return HIGH_SEVERITY_CLASS;
    }
    case MEDIUM_SEVERITY: {
      return MEDIUM_SEVERITY_CLASS;
    }
    case LOW_SEVERITY: {
      return LOW_SEVERITY_CLASS;
    }
    case INFO_SEVERITY: {
      return INFO_SEVERITY_CLASS;
    }
    case NETWORK_ANOMALY: {
      return LOW_SEVERITY_CLASS;
    }
    case BEHAVIORAL_ANOMALY: {
      return BEHAVIORAL_ANOMALY_CLASS;
    }
    case SYSTEM_AUDIT: {
      return MEDIUM_SEVERITY_CLASS;
    }
    case SYSCALL_ANOMALY: {
      return HIGH_SEVERITY_CLASS;
    }
    case FILE_ANOMALY: {
      return 'file-anomaly';
    }
    case PROCESS_ANOMALY: {
      return 'process-anomaly';
    }
    case SE_LINUX_ANOMALY: {
      return 'selinux-apparmour-anomaly';
    }
    case CONNECTION_ANOMALY: {
      return 'connection-anomaly';
    }
    case CORRELATION_ANOMALY: {
      return 'correlation-anomaly';
    }
    default: {
      return MEDIUM_SEVERITY_CLASS;
    }
  }
}

/* START :: Severity based node color config */
export function getNodeSeverityStrokeColor(container, host, nodeSeverityCollection, topologyId) {
  if (nodeSeverityCollection && (topologyId == 'containers' || topologyId == 'hosts' || topologyId == 'pods')) {
    let severity;
    if (topologyId == 'containers') {
      if (nodeSeverityCollection[host] && nodeSeverityCollection[host].hasOwnProperty('containers')){
        severity = nodeSeverityCollection[host]['containers'][container];
      }
    } else if (topologyId == 'hosts'){
      if (nodeSeverityCollection[container] && nodeSeverityCollection[container].hasOwnProperty('severity')) {
        severity = nodeSeverityCollection[container]['severity'];
      }
    } else if (topologyId = 'pods') {
      const podName = container;
      const hostList = host || [];
      if (typeof hostList.forEach === "function") {
        hostList.forEach((host) => {
          const hostLevel = nodeSeverityCollection[host.get('label')] || {};
          if (hostLevel.severity) {
            const podLevel = hostLevel.pods || {};
            const podSeverity = podLevel[podName];
            if (podSeverity) {
              severity = podSeverity; 
            }
          }
        });
      }
    }
    switch (severity) {
      case CRITICAL_ALERT: {
        return CRITICAL_ALERT_COLOR;
      }
      case HIGH_ALERT: {
        return HIGH_ALERT_COLOR;
      }
      case MEDIUM_ALERT: {
        return MEDIUM_ALERT_COLOR;
      }
      case LOW_ALERT: {
        return LOW_ALERT_COLOR;
      }
      case INFO_ALERT: {
        return colorCode.GREY;
      }
      default: {
        return DEFAULT_COLOR;
      }
    }
  } else {
    return DEFAULT_COLOR;
  }
}

export function getNodeSeverityColor(container, host, nodeSeverityCollection, topologyId) {
  if (nodeSeverityCollection && (topologyId == 'containers' || topologyId == 'hosts' || topologyId == 'pods')) {
    let severity;
    if (topologyId == 'containers') {
      if (nodeSeverityCollection[host] && nodeSeverityCollection[host].hasOwnProperty('containers')){
        severity = nodeSeverityCollection[host]['containers'][container];
      }
    } else if (topologyId == 'hosts'){
      if (nodeSeverityCollection[container] && nodeSeverityCollection[container].hasOwnProperty('severity')) {
        severity = nodeSeverityCollection[container]['severity'];
      }
    } else if (topologyId = 'pods') {
      const podName = container;
      const hostList = host || [];
      if (typeof hostList.forEach === "function") {
        hostList.forEach((host) => {
          const hostLevel = nodeSeverityCollection[host.get('label')] || {};
          if (hostLevel.severity) {
            const podLevel = hostLevel.pods || {};
            const podSeverity = podLevel[podName];
            if (podSeverity) {
              severity = podSeverity; 
            }
          }
        });
      }
    }
    switch (severity) {
      case CRITICAL_ALERT: {
        return NODE_CRITICAL_BACKGROUND_COLOR;
      }
      case HIGH_ALERT: {
        return NODE_HIGH_BACKGROUND_COLOR;
      }
      case MEDIUM_ALERT: {
        return NODE_MEDIUM_BACKGROUND_COLOR;
      }
      case LOW_ALERT: {
        return NODE_LOW_BACKGROUND_COLOR;
      }
      case INFO_ALERT: {
        return colorCode.GREY_OPAQUE;
      }
      default: {
        return NODE_DEFAULT_BACKGROUND_COLOR;
      }
    }
  } else {
    return NODE_DEFAULT_BACKGROUND_COLOR;
  }
}
/* END :: Severity based node color config */
