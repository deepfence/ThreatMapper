/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable react/jsx-curly-brace-presence */
/* eslint-disable import/no-cycle */
import React, { useState } from 'react';
import { Route, withRouter } from 'react-router-dom';
import ComplianceTable from '../compliance-table';
import ComplianceSummary from '../compliance-summary';
import { ComplianceStats } from '../compliance-stats';
import DFSelect from '../../common/multi-select/app';
import { REGION_OPTIONS } from '../../../constants/dropdown-option-collection';

export const AwsTerraFormScript = withRouter(props => {
  const [collapsed, setCollapsed] = useState(true);
  const [collapsedTerraform, setCollapsedTerraform] = useState(true);
  const [collapsedCloudFormation, setCollapsedCloudFormation] = useState(true);
  const [regionValue, setRegionValue] = useState();
  const terraformLink =
    'https://registry.terraform.io/modules/deepfence/cloud-scanner/aws/latest/examples/single-account-ecs#usage';

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
              <br />
            </p>
          </div>

          <h5
            style={{
              cursor: 'pointer',
              color: 'white',
              justifyContent: 'flex-start',
              marginBottom: 0,
              marginLeft: '20px',
            }}
            onClick={() => setCollapsedCloudFormation(!collapsedCloudFormation)}
            className="name heading"
          >
            {collapsedCloudFormation ? (
              <i className="fa fa-chevron-right" />
            ) : (
              <i className="fa fa-chevron-down" />
            )}
            &nbsp;&nbsp; Cloudformation
          </h5>

          {!collapsedCloudFormation ? (
            <div style={{ marginLeft: '20px' }}>
              <br />

              <div className="duration-container df-select-field">
                <DFSelect
                  options={REGION_OPTIONS.options.map(el => ({
                    value: el.value,
                    label: el.label,
                  }))}
                  onChange={e => setRegionValue(e.value)}
                  placeholder={REGION_OPTIONS.heading}
                  clearable={false}
                />
              </div>
              <br />

              {regionValue && (
                <div style={{ marginBottom: '20px' }}>
                  <a
                    href={`https://${regionValue}.console.aws.amazon.com/cloudformation/home?region=${regionValue}#/stacks/create/review
   ?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/deepfence-cloud-scanner.template
   &stackName=Deepfence-Cloud-Scanner`}
                    disabled={regionValue === undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Deploy --&gt;{' '}
                  </a>
                </div>
              )}
            </div>
          ) : null}

          <h5
            style={{
              cursor: 'pointer',
              color: 'white',
              justifyContent: 'flex-start',
              marginBottom: 0,
              marginLeft: '20px',
            }}
            onClick={() => setCollapsedTerraform(!collapsedTerraform)}
            className="name heading"
          >
            {collapsedTerraform ? (
              <i className="fa fa-chevron-right" />
            ) : (
              <i className="fa fa-chevron-down" />
            )}
            &nbsp;&nbsp; Terraform
          </h5>

          {!collapsedTerraform ? (
            <div style={{ marginLeft: '20px' }}>
              <a target="_blank" rel="noreferrer" href={terraformLink}>
                {terraformLink}
              </a>
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
