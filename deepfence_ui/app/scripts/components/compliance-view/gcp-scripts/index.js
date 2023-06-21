/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable import/no-cycle */
import React, { useState } from 'react';
import { withRouter } from 'react-router-dom';
import { ComplianceStats } from '../compliance-stats';

import ComplianceTable from '../compliance-table';

export const GcpTerraFormScript = withRouter(props => {
  const [collapsed, setCollapsed] = useState(true);
  const terraformLink = "https://community.deepfence.io/threatmapper/docs/v1.5/cloudscanner/gcp";

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
              Deploy Deepfence Compliance Scanner with Terraform using the code
              samples below for a single project.
              <br/>
              <a target="_blank" rel="noreferrer" href={terraformLink}>{terraformLink}</a>
            </p>
          </div>
        </div>
      ) : null}
      <ComplianceStats />

      <ComplianceTable cloudType="gcp" />
    </div>
  );
});
