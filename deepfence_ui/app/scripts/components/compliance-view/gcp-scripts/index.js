/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable import/no-cycle */
import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import { ComplianceStats } from '../compliance-stats';

import ComplianceTable from '../compliance-table';

export const GcpTerraFormScript = withRouter(props => {
  return (
    <div
      style={{
        paddingTop: '8px',
      }}
    >
      <Link
        style={{
          cursor: 'pointer',
          color: 'white',
          marginBottom: 0,
        }}
        className="name heading"
        to="/onboard/cloud-platform/?gcp"
      >
        Setup Instructions
      </Link>

      <ComplianceStats />
      <ComplianceTable cloudType="gcp" />
    </div>
  );
});
