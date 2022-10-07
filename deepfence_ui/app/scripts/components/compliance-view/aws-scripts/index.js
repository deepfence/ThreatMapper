/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable react/jsx-curly-brace-presence */
/* eslint-disable import/no-cycle */
import React from 'react';
import { Route, withRouter, Link } from 'react-router-dom';
import ComplianceTable from '../compliance-table';
import ComplianceSummary from '../compliance-summary';
import { ComplianceStats } from '../compliance-stats';

export const AwsTerraFormScript = withRouter(props => {
  /*eslint-disable*/
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
        to="/onboard/cloud-platform/?aws"
      >
        Setup Instructions
      </Link>
      <ComplianceStats />
      <ComplianceTable cloudType="aws" />
      <Route
        exact
        path={`${props.match.path}/:id`}
        render={() => {
          return <ComplianceSummary />;
        }}
      />
    </div>
  );
});
