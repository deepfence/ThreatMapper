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
  width: 80%;
`;

const Gap = styled.div`
  height: 20px;
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
    color: #0080ff;
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
  line-height: 20px;
  text-align: center;
  padding: 6px 18px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #1b52b1;
  }
  & a:hover {
    text-decoration: none;
  }
`;

const PreTag = styled.pre`
  margin-top: 8px;
  white-space: pre-wrap;
  font-family: monospace;
  border-radius: 8px;
  padding: 8px;
  position: relative;
  font-size: 14px;
  line-height: 24px;
  color: #cccccc;
  background: #000;
`;

const Body = styled.div`
  padding: 1em;
  color: #c0c0c0;
`;

const MainHeading = styled.h5``;
const SubHeading = styled.p`
  font-size: 16px;
`;

const Text = styled.p`
  font-size: 14px;
`;

const terraformLink =
  'https://registry.terraform.io/modules/deepfence/cloud-scanner/aws/latest/examples/single-account-ecs#usage';

const AwsSetup = () => {
  const [regionValue, setRegionValue] = useState();
  return (
    <Body>
      <MainHeading>Connect your AWS Account</MainHeading>
      <Text>
        Deploy all modules for Deepfence Compliance Scanner for a single
        account. For information on AWS Organizations and account types, see AWS
        docs.
      </Text>
      <Text>You can connect your AWS account in two ways:</Text>

      <FormWrapper>
        <SubHeading>1. Connect with Cloud Formation</SubHeading>
        <Text>
          First login to your aws account. Select your AWS region from the given
          below dropdown and click on run cloud formation.
        </Text>

        <Action id="awsActionId">
          <div className="df-select-field">
            <DFSelect
              options={REGION_OPTIONS.options.map(el => ({
                value: el.value,
                label: el.label,
              }))}
              onChange={e => setRegionValue(e.value)}
              placeholder={REGION_OPTIONS.heading}
              clearable={false}
              styles={{
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: '#000',
                  color: state.isSelected ? 'red' : 'blue',
                }),
              }}
            />
          </div>
          {regionValue !== undefined && (
            <RunButton>
              <a
                href={`https://${regionValue}.console.aws.amazon.com/cloudformation/home?region=${regionValue}#/stacks/create/review?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/deepfence-cloud-scanner.template&stackName=Deepfence-Cloud-Scanner`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#fff',
                }}
              >
                Run cloud formation &nbsp;
                <i className="fa fa-long-arrow-right" aria-hidden="true" />
              </a>
            </RunButton>
          )}
        </Action>
      </FormWrapper>
      <Gap />
      <FormWrapper>
        <SubHeading>2. Terraform</SubHeading>
        <p>Single Account</p>
        <Text>
          Copy the code below and paste it into a .tf file on your local
          machine.
        </Text>
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

        <Text>Then run the following commands:</Text>

        <PreTag>
          $ terraform init
          <br />
          $ terraform plan
          <br />$ terraform apply
        </PreTag>
      </FormWrapper>
      <div>
        <div>
          <Text
            style={{
              margin: 0,
            }}
          >
            More details on terraform commands can be found here:
          </Text>
        </div>
        <Text>
          <a target="_blank" rel="noreferrer" href={terraformLink}>
            {terraformLink}
          </a>
        </Text>
      </div>
    </Body>
  );
};

const GcpSetup = () => {
  return (
    <Body>
      <MainHeading>Connect your GCP Account</MainHeading>
      <Text>
        Deploy Deepfence Compliance Scanner with Terraform using the code
        samples below for a single project.
      </Text>
      <FormWrapper>
        <SubHeading>Single Account</SubHeading>
        <Text>
          Copy the code below and paste it into a .tf file on your local
          machine.
        </Text>
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

        <Text>Then run the following commands:</Text>

        <PreTag>
          $ terraform init
          <br />
          $ terraform plan
          <br />$ terraform apply
        </PreTag>
      </FormWrapper>
      <div>
        <div>
          <Text
            style={{
              margin: 0,
            }}
          >
            More details on terraform commands can be found here:
          </Text>
        </div>
        <Text>
          <a target="_blank" rel="noreferrer" href={terraformLink}>
            {terraformLink}
          </a>
        </Text>
      </div>
    </Body>
  );
};

const AzureSetup = () => {
  return (
    <Body>
      <MainHeading>Connect your AZURE Account</MainHeading>
      <Text>
        Deploy Deepfence Compliance Scanner with Terraform using the code
        samples below for a single subscription.
      </Text>
      <FormWrapper>
        <SubHeading>Single Account</SubHeading>
        <Text>
          Copy the code below and paste it into a .tf file on your local
          machine.
        </Text>
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

        <Text>Then run the following commands:</Text>

        <PreTag>
          $ terraform init
          <br />
          $ terraform plan
          <br />$ terraform apply
        </PreTag>
      </FormWrapper>
      <div>
        <div>
          <Text
            style={{
              margin: 0,
            }}
          >
            More details on terraform commands can be found here:
          </Text>
          :
        </div>
        <Text>
          <a target="_blank" rel="noreferrer" href={terraformLink}>
            {terraformLink}
          </a>
        </Text>
      </div>
    </Body>
  );
};

/**
 * Cloud component holds aws, gcp and azure instructions
 * @param {*} props
 * @returns
 */

export const Cloud = props => {
  const { defaultCloud = 'aws' } = props;
  const [choosen, setChoosen] = useState({
    aws: defaultCloud === 'aws',
    azure: defaultCloud === 'azure',
    gcp: defaultCloud === 'gcp',
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

/**
 * CloudModal component will be called only when a new user onboard and not connected to Deepfence Console
 * @param {open, setModal} props - open opens the modal
 * setModal close the modal by setting to empty value of cloud
 * @returns
 */

export const CloudModal = props => {
  const { open, setModal } = props;

  if (!open) {
    return null;
  }

  return (
    <OnboardModal isOpen={open} setModal={setModal}>
      <Cloud {...props} />
    </OnboardModal>
  );
};
