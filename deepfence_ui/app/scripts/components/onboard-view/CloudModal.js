import React, { useState } from 'react';
import styled from 'styled-components';
import { REGION_OPTIONS } from '../../constants/dropdown-option-collection';
import DFSelect from '../common/multi-select/app';
import { OnboardModal } from './OnboardModal';
import aws from '../../../images/onboard/amazon-aws.svg';
import azure from '../../../images/azure.png';
import gcp from '../../../images/gcp.png';

const Grid = styled.div`
  display: grid;
  overflow: hidden;
  width: 100%;
`;
const Tabs = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: 1em;
  position: fixed;
  width: 20%;
  max-width: 100px;
  @media (min-width: 1080px) {
    max-width: 200px;
  }
`;

const SetupContent = styled.div`
  margin-left: 20%;
  overflow-y: scroll;
  width: 100%;
`;

const Gap = styled.div`
  height: 30px;
`;

const CloudButton = styled.button`
  all: unset;
  display: flex;
  outline: none;
  padding: 0;
  border-radius: 0px;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  height: 40px;
  cursor: pointer;
  &:focus {
    outline: none;
    background-color: #2e2e2e;
    transition: background-color 0.05s ease-in 0.05s;
  }
  ${({ active }) =>
    active &&
    `
    background-color: #2e2e2e;
    &:after {
        content: '';
        display: block;
        position: absolute;
        left: 100%;
        width: 0;
        height: 0;
        border-top: 20px solid transparent;
        border-right: 20px solid transparent;
        border-bottom: 20px solid transparent;
        border-left: 20px solid #2e2e2e;
      }
  `}
`;

const FormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
`;

const Action = styled.div`
  display: flex;
  flex-direction: row;
  padding-top: 16px;
  gap: 1em;
`;

const RunButton = styled.button`
  all: unset;
  font-size: 15px;
  background-color: #2166da;
  border: none;
  color: #ffffff;
  font-family: 'Source Sans Pro', sans-serif;
  line-height: 20px;
  text-align: center;
  padding: 6px 18px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #3778e1;
  }
`;

const PreTag = styled.pre`
  margin-top: 8px;
  white-space: pre-wrap;
  font-family: monospace;
  border-radius: 8px;
  padding: 8px;
  position: relative;
  font-size: 1rem;
  line-height: 24px;
  color: #cccccc;
  background: #000;
`;

const Body = styled.div`
  padding: 1em;
`;

const terraformLink =
  'https://registry.terraform.io/modules/deepfence/cloud-scanner/aws/latest/examples/single-account-ecs#usage';

const AwsSetup = () => {
  const [regionValue, setRegionValue] = useState();
  return (
    <Body>
      <h4>Connect your AWS Account</h4>
      <p>
        Deploy all modules for Deepfence Compliance Scanner for a single
        account. For information on AWS Organizations and account types, see AWS
        docs.
      </p>
      <p>You can connect your AWS account in two ways:</p>

      <FormWrapper>
        <h5>1. Connect with Cloud Formation</h5>
        <span>
          This is so simple, first select your AWS region and click on run cloud
          formation.
        </span>

        <Action>
          <DFSelect
            options={REGION_OPTIONS.options.map(el => ({
              value: el.value,
              label: el.label,
            }))}
            onChange={e => setRegionValue(e.value)}
            placeholder={REGION_OPTIONS.heading}
            clearable={false}
          />
          <RunButton type="button">
            Run cloud formation &nbsp;&nbsp;
            <i className="fa fa-long-arrow-right" aria-hidden="true" />
          </RunButton>
        </Action>
      </FormWrapper>
      <Gap />
      <FormWrapper>
        <h5>2. Terraform</h5>
        <p>Single Account</p>
        <span>
          Copy the code below and paste it into a .tf file on your local
          machine.
        </span>
        <PreTag>{`provider "aws" {
region = "<AWS-REGION>; eg. us-east-1"
}

module "cloud-scanner_example_single-account-ecs" {
source                        = "deepfence/cloud-scanner/aws//examples/single-account-ecs"
version                       = "0.1.0"
mgmt-console-url              = "<Console URL> eg. XXX.XXX.XX.XXX"
mgmt-console-port             = "443"
deepfence-key                 = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}
`}</PreTag>

        <span>Then run the following commands:</span>

        <PreTag>
          $ terraform init
          <br />
          $ terraform plan
          <br />$ terraform apply
        </PreTag>
      </FormWrapper>
      <div>
        <div>More details on terraform commands can be found here:</div>
        <a target="_blank" rel="noreferrer" href={terraformLink}>
          {terraformLink}
        </a>
      </div>
    </Body>
  );
};

const GcpSetup = () => {
  return (
    <Body>
      <h4>Connect your GCP Account</h4>
      <p>
        Deploy Deepfence Compliance Scanner with Terraform using the code
        samples below for a single project.
      </p>
      <FormWrapper>
        <p>Single Account</p>
        <span>
          Copy the code below and paste it into a .tf file on your local
          machine.
        </span>
        <PreTag>{`
provider "google" {
   project = "<PROJECT_ID>; ex. dev1-123456"
   region  = "<REGION_ID>; ex. asia-east1"
}

provider "google-beta" {
   project = "<PROJECT_ID> ex. dev1-123456"
   region  = "<REGION_ID>; ex. asia-east1"
}

module "cloud-scanner_example_single-project" {
  source              = "deepfence/cloud-scanner/gcp//examples/single-project"
  version             = "0.1.0"
  mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port   = "443"
  deepfence-key       = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}
`}</PreTag>

        <span>Then run the following commands:</span>

        <PreTag>
          $ terraform init
          <br />
          $ terraform plan
          <br />$ terraform apply
        </PreTag>
      </FormWrapper>
      <div>
        <div>More details on terraform commands can be found here:</div>
        <a target="_blank" rel="noreferrer" href={terraformLink}>
          {terraformLink}
        </a>
      </div>
    </Body>
  );
};

const AzureSetup = () => {
  return (
    <Body>
      <h4>Connect your AZURE Account</h4>
      <p>
        Deploy Deepfence Compliance Scanner with Terraform using the code
        samples below for a single subscription.
      </p>
      <FormWrapper>
        <p>Single Account</p>
        <span>
          Copy the code below and paste it into a .tf file on your local
          machine.
        </span>
        <PreTag>{`provider "azurerm" {
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
`}</PreTag>

        <span>Then run the following commands:</span>

        <PreTag>
          $ terraform init
          <br />
          $ terraform plan
          <br />$ terraform apply
        </PreTag>
      </FormWrapper>
      <div>
        <div>More details on terraform commands can be found here:</div>
        <a target="_blank" rel="noreferrer" href={terraformLink}>
          {terraformLink}
        </a>
      </div>
    </Body>
  );
};

export const Cloud = () => {
  const [choosen, setChoosen] = useState({
    aws: true,
    azure: null,
    gcp: null,
  });
  return (
    <Grid>
      <Tabs>
        <aside>
          <CloudButton
            type="button"
            active={choosen.aws}
            onClick={() => {
              setChoosen({
                aws: true,
                azure: null,
                gcp: null,
              });
            }}
          >
            <img
              src={aws}
              alt="Aws"
              width="36"
              height="36"
              style={{
                outline: 'none',
              }}
            />{' '}
            AWS
            {/* <RightArrow /> */}
          </CloudButton>
          <CloudButton
            type="button"
            active={choosen.gcp}
            onClick={() => {
              setChoosen({
                aws: null,
                azure: null,
                gcp: true,
              });
            }}
          >
            <img
              className="img-fluid"
              src={gcp}
              alt="Aws"
              width="36"
              height="36"
            />{' '}
            GCP
          </CloudButton>
          <CloudButton
            type="button"
            active={choosen.azure}
            onClick={() => {
              setChoosen({
                aws: null,
                azure: true,
                gcp: null,
              });
            }}
          >
            <img
              className="img-fluid"
              src={azure}
              alt="Aws"
              width="36"
              height="36"
            />{' '}
            AZURE
          </CloudButton>
        </aside>
      </Tabs>
      <SetupContent>
        {choosen.aws && <AwsSetup />}
        {choosen.gcp && <GcpSetup />}
        {choosen.azure && <AzureSetup />}
      </SetupContent>
    </Grid>
  );
};
export const CloudModal = props => {
  const { open, setModal } = props;

  return (
    <OnboardModal isOpen={open} setModal={setModal}>
      <Cloud />
    </OnboardModal>
  );
};
