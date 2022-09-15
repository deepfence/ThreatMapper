/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable import/no-cycle */
import React, { useState } from 'react';

import { withRouter } from 'react-router-dom';
import { ComplianceStats } from '../compliance-stats';
import ComplianceTable from '../compliance-table';

export const AzureTerraFormScript = withRouter(props => {
  const [collapsed, setCollapsed] = useState(true);
  const terraformLink = "https://registry.terraform.io/modules/deepfence/cloud-scanner/azure/latest/examples/single-subscription#usage";

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
              samples below for a single subscription.
              <br/>
              <a target="_blank" rel="noreferrer" href={terraformLink}>{terraformLink}</a>
            </p>
          </div>
          <h6 style={{ color: 'white', marginTop: '20px' }}>
            {' '}
            Single subscription{' '}
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
              <pre style={{ color: 'white' }}>{`provider "azurerm" {
  features {}
  subscription_id = "<SUBSCRIPTION_ID eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX>"
}

module "cloud-scanner_example_single-subscription" {
  source              = "deepfence/cloud-scanner/azure//examples/single-subscription"
  version             = "0.1.0"
  mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port   = "443"
  deepfence-key       = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
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
                marginBottom: '100px',
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
      <ComplianceTable cloudType="azure" />
    </div>
  );
});
