/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable react/jsx-curly-brace-presence */
/* eslint-disable import/no-cycle */
import React, { useState } from 'react';
import { Route, withRouter } from 'react-router-dom';
import ComplianceTable from '../compliance-table';
import ComplianceSummary from '../compliance-summary';
import { ComplianceStats } from '../compliance-stats';

export const AwsTerraFormScript = withRouter(props => {
  const [collapsed, setCollapsed] = useState(true);
  const terraformLink = "https://registry.terraform.io/modules/deepfence/cloud-scanner/aws/latest/examples/single-account-ecs#usage";

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
              Deploy all modules for Deepfence Compliance Scanner for a single
              account.
              <br />
              For information on AWS Organizations and account types, see AWS
              docs.
              <br/>
              <a target="_blank" rel="noreferrer" href={terraformLink}>{terraformLink}</a>
            </p>
          </div>
          <h6 style={{ color: 'white', marginTop: '20px' }}>
            {' '}
            Single account{' '}
          </h6>
          <div style={{ marginTop: '15px' }}>
            <span style={{ fontSize: '11px' }}>
              Copy the code below and paste it into a .tf file on your local
              machine.
            </span>
            <div
              style={{
                backgroundColor: 'black',
                padding: '10px',
                color: 'white',
              }}
            >
              <pre style={{ color: 'white' }}>{`provider "aws" {
  region = "<AWS-REGION>; eg. us-east-1"
}

module "cloud-scanner_example_single-account-ecs" {
  source                        = "deepfence/cloud-scanner/aws//examples/single-account-ecs"
  version                       = "0.1.0"
  mgmt-console-url              = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port             = "443"
  deepfence-key                 = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}
`}</pre>
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            <span style={{ fontSize: '11px' }}>then run:</span>
            <div
              style={{
                backgroundColor: 'black',
                color: 'white',
              }}
            >
              <pre style={{ color: 'white' }}>
                $ terraform init
                <br />
                $ terraform plan
                <br />
                $ terraform apply
                <br />
              </pre>
            </div>
          </div>
        </div>
      ) : null}
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
