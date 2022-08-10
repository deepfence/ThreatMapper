/* eslint-disable import/no-cycle */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable react/jsx-curly-brace-presence */
import React, { useState } from 'react';
import { withRouter } from 'react-router-dom';

import ComplianceTable from '../compliance-table';

export const LinuxTerraFormScript = withRouter(() => {
  const [collapsed, setCollapsed] = useState(true);

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
              Please install the deepfence sensors to your Linux VMs to check
              for compliance misconfigurations
            </p>
          </div>
        </div>
      ) : null}
      <ComplianceTable cloudType="linux" />
    </div>
  );
});
