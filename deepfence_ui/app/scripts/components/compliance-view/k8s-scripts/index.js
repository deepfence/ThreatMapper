/* eslint-disable import/no-cycle */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable react/jsx-curly-brace-presence */
import React, { useState } from 'react';
import { withRouter } from 'react-router-dom';

import ComplianceTable from '../compliance-table';

export const K8sTerraFormScript = withRouter(() => {
  const [collapsed, setCollapsed] = useState(true);
  const docsLink = 'https://community.deepfence.io/threatmapper/docs/v1.5/kubernetes-scanner/';

  return (
    <div
      style={{
        paddingTop: '8px',
      }}
    >
      <h5
        style={{
          cursor: 'pointer',
          color: 'white',
          justifyContent: 'flex-start',
          marginBottom: 0,
        }}
        onClick={() => setCollapsed(!collapsed)}
        className="name heading"
      >
        {collapsed ? (
          <i className="fa fa-chevron-right" />
        ) : (
          <i className="fa fa-chevron-down" />
        )}
        &nbsp;&nbsp; Setup instructions
      </h5>
      {!collapsed ? (
        <div
          style={{
            paddingLeft: '16px',
            paddingRight: '16px',
            backgroundColor: '#141414',
          }}
        >
          <div style={{ paddingTop: '17px' }}>
            <p>
              Please install the deepfence-k8s-scanner helm chart to your Kubernetes cluster to check for compliance misconfigurations
              <br/>
              <a target="_blank" rel="noreferrer" href={docsLink}>
                {docsLink}
              </a>
            </p>
          </div>
        </div>
      ) : null}
      <ComplianceTable cloudType="kubernetes" />
    </div>
  );
});
