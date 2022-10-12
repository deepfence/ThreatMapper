/* eslint-disable import/no-cycle */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable react/jsx-curly-brace-presence */
import React from 'react';
import { Link, withRouter } from 'react-router-dom';

import ComplianceTable from '../compliance-table';

export const LinuxTerraFormScript = withRouter(() => {
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
        to={{
          pathname: '/onboard/cloud-agent',
          state: {
            type: 'host',
          },
        }}
      >
        Setup Instructions
      </Link>
      <ComplianceTable cloudType="linux" />
    </div>
  );
});
