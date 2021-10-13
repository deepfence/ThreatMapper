/* eslint-disable */
import React, { memo, useCallback, useMemo } from 'react';
import SankeyChart from '../charts/sankey-chart/index';
const processSankeyDataRaw = (rawCVE, rawAlerts) => {
  const result = [];
  if (rawCVE.length > 0) {
    const cve = rawCVE.map(cveInst => cveInst._source);

    // CVE id severity
    const cveIdSeverity = cve.reduce((acc, cveInst) => {
      if (acc[cveInst.cve_id]) {
        if (acc[cveInst.cve_id][cveInst.cve_severity]) {
          acc[cveInst.cve_id][cveInst.cve_severity] += 1;
        } else {
          acc[cveInst.cve_id] = {
            ...acc[cveInst.cve_id],
            [cveInst.cve_severity]: 1,
          };
        }
      } else {
        acc = {
          ...acc,
          [cveInst.cve_id]: {
            [cveInst.cve_severity]: 1,
          }
        };
      }
      return acc;
    }, {});

    if (cve.length > 0) {
      cveIdSeverity[''] = {
        info: 0,
        low: 0,
        high: 0,
        medium: 0,
        critical: 0,
      };
    }
    for (let i = 0; i < Object.keys(cveIdSeverity).length; i += 1) {
      const cveId = Object.keys(cveIdSeverity)[i];
      for (let j = 0; j < Object.keys(cveIdSeverity[cveId]).length; j += 1) {
        const cveSeverity = Object.keys(cveIdSeverity[cveId])[j];
        if (cveId !== 'undefined' && cveSeverity !== 'undefined') {
          result.push({ source: cveId, target: cveSeverity, value: cveIdSeverity[cveId][cveSeverity] });
        }
      }
    }
  }


  const aler = rawAlerts.map(alert => alert._source);
  const alerts = aler.slice(0, 15);

  // severity direciton
  const severityDirection = alerts.reduce((acc, alert) => {
    if (acc[alert.severity]) {
      if (acc[alert.severity][alert.direction]) {
        acc[alert.severity][alert.direction] += 1;
      } else {
        acc[alert.severity] = {
          ...acc[alert.severity],
          [alert.direction]: 1,
        };
      }
    } else {
      acc = {
        ...acc,
        [alert.severity]: {
          [alert.direction]: 1,
        }
      };
    }
    return acc;
  }, {});
  for (let i = 0; i < Object.keys(severityDirection).length; i += 1) {
    const severity = Object.keys(severityDirection)[i];
    for (let j = 0; j < Object.keys(severityDirection[severity]).length; j += 1) {
      const direction = Object.keys(severityDirection[severity])[j];
      if (severity !== 'undefined' && direction !== 'undefined') {
        result.push({ source: severity, target: direction, value: severityDirection[severity][direction] });
      }
    }
  }
  // Diretion resource type
  const directionResourceType = alerts.reduce((acc, alert) => {
    const resourceType = alert.resource_type || 'custom resource';
    if (acc[alert.direction]) {
      if (acc[alert.direction][resourceType]) {
        acc[alert.direction][resourceType] += 1;
      } else {
        acc[alert.direction] = {
          ...acc[alert.direction],
          [resourceType]: 1,
        };
      }
    } else {
      acc = {
        ...acc,
        [alert.direction]: {
          [resourceType]: 1,
        }
      };
    }
    return acc;
  }, {});
  for (let i = 0; i < Object.keys(directionResourceType).length; i += 1) {
    const direction = Object.keys(directionResourceType)[i];
    for (let j = 0; j < Object.keys(directionResourceType[direction]).length; j += 1) {
      const resourceType = Object.keys(directionResourceType[direction])[j];
      if (direction !== 'undefined' && resourceType !== 'undefined') {
        result.push({ source: direction, target: resourceType, value: directionResourceType[direction][resourceType] });
      }
    }
  }

  // resource type class type
  const resourceTypeClassType = alerts.reduce((acc, alert) => {
    const resourceType = alert.resource_type || 'custom resource';
    if (acc[resourceType]) {
      if (acc[resourceType][alert.classtype]) {
        acc[resourceType][alert.classtype] += 1;
      } else {
        acc[resourceType] = {
          ...acc[resourceType],
          [alert.classtype]: 1,
        };
      }
    } else {
      acc = {
        ...acc,
        [resourceType]: {
          [alert.classtype]: 1,
        }
      };
    }
    return acc;
  }, {});
  for (let i = 0; i < Object.keys(resourceTypeClassType).length; i += 1) {
    const resourceType = Object.keys(resourceTypeClassType)[i];
    for (let j = 0; j < Object.keys(resourceTypeClassType[resourceType]).length; j += 1) {
      const classtype = Object.keys(resourceTypeClassType[resourceType])[j];
      if (resourceType !== 'undefined' && classtype !== 'undefined') {
        result.push({ source: resourceType, target: classtype, value: resourceTypeClassType[resourceType][classtype] });
      }
    }
  }
  return result;
};

export const AlertCorrelationView = (props) => {

  const renderColumnLabels = () => {
    const labels = ['Vulnerabilities', 'Severity', 'Alert Direction', 'Resource Type', 'Attack Classtype'];
    return (
      <div className="sankey-column-labels">
        {labels.map(label => (
          <div key={label}>
            {label}
          </div>
        ))
        }
      </div>
    );
  }

  const {
    data: {
      alerts: rawAlerts = [],
      cve: rawCVE = [],
    },
  } = props;

  const result = useMemo(() => {
    return processSankeyDataRaw(rawCVE, rawAlerts)
  }, [rawAlerts, rawCVE]);

  let finalData = result.filter((d) => {
    if (d.value === 0) {
      let flag = false;
      result.map((data) => {
        if (d.target === data.source) flag = true;
      });
      if (flag) return d;
    } else {
      return d;
    }
  });

  return (
    <div className="">
      {renderColumnLabels()}
      <SankeyChart
        data={finalData}
        name="Alerts"
      />
    </div>
  );
}
