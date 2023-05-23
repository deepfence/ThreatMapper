import { useState } from 'react';
import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, Switch, TextInput, Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';
/*
sample json
  {
    "name": "example_ecr",
    "non_secret": {
      "use_iam_role": "false",
      "is_public": "false",
      "aws_access_key_id": "access_key_id",
      "aws_region_name": "region_name",
      "aws_account_id": "account_id",
      "target_account_role_arn": "role_arn"
    },
    "secret": {
      "aws_secret_access_key": "secret_access_key"
    },
    "registry_type": "ecr"
  }
*/
export const AmazonECRConnectorForm = ({
  errorMessage,
  fieldErrors,
}: RegistryFormProps) => {
  const [isPublic, setIsPublic] = useState(false);
  const [useIAMRole, setUseIAMRole] = useState(false);
  return (
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Amazon Registry Connecton">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to your Amazon Cloud Account. Find out more information by{' '}
          <DFLink
            href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/gcp/latest/examples/single-project#usage`}
            target="_blank"
            rel="noreferrer"
          >
            reading our documentation
          </DFLink>
          .
        </div>
      </Step>
      <Step indicator="1" title="Region Selection">
        <Card className="w-full relative p-5 mt-2">
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry Name"
            type={'text'}
            sizing="sm"
            name="name"
            placeholder="Registry Name"
            color={fieldErrors?.['name'] ? 'error' : 'default'}
            helperText={fieldErrors?.['name']}
          />
          <div className="flex flex-col gap-4 mt-4">
            <Switch
              name="non_secret.is_public"
              label="Public Registry Information"
              checked={isPublic}
              onCheckedChange={(checked) => {
                setIsPublic(checked);
              }}
            />
            <Switch
              name="non_secret.use_iam_role"
              label="Use AWS IAM Role"
              checked={useIAMRole}
              onCheckedChange={(checked) => {
                setUseIAMRole(checked);
              }}
            />
          </div>
          <div className="mt-5 flex flex-row gap-4">
            {!useIAMRole ? (
              <>
                <TextInput
                  className="w-3/4 min-[200px] max-w-xs"
                  label="AWS Access Key"
                  type={'text'}
                  sizing="sm"
                  name="non_secret.aws_access_key_id"
                  placeholder="AWS Access Key"
                  color={
                    fieldErrors?.['non_secret.aws_access_key_id'] ? 'error' : 'default'
                  }
                  helperText={fieldErrors?.['non_secret.aws_access_key_id']}
                />
                <TextInput
                  className="w-3/4 min-[200px] max-w-xs"
                  label="AWS Secret Key"
                  type={'password'}
                  sizing="sm"
                  name="secret.aws_secret_access_key"
                  placeholder="AWS Secret Key"
                  color={
                    fieldErrors?.['secret.aws_secret_access_key'] ? 'error' : 'default'
                  }
                  helperText={fieldErrors?.['secret.aws_secret_access_key']}
                />
              </>
            ) : (
              <>
                <TextInput
                  className="w-3/4 min-[200px] max-w-xs"
                  label="AWS Account ID"
                  type={'text'}
                  sizing="sm"
                  name="non_secret.aws_account_id"
                  placeholder="AWS Account ID"
                  color={fieldErrors?.['non_secret.aws_account_id'] ? 'error' : 'default'}
                  helperText={fieldErrors?.['non_secret.aws_account_id']}
                />
                <TextInput
                  className="w-3/4 min-[200px] max-w-xs"
                  label="Target Account Role ARN"
                  type={'text'}
                  sizing="sm"
                  name="non_secret.target_account_role_arn"
                  placeholder="Target Account Role ARN"
                  color={
                    fieldErrors?.['non_secret.target_account_role_arn']
                      ? 'error'
                      : 'default'
                  }
                  helperText={fieldErrors?.['non_secret.target_account_role_arn']}
                />
              </>
            )}
            {!isPublic ? (
              <TextInput
                className="w-3/4 min-[200px] max-w-xs"
                label="AWS Region"
                type={'text'}
                sizing="sm"
                name="non_secret.aws_region_name"
                placeholder="AWS Region"
                color={fieldErrors?.['non_secret.aws_region_name'] ? 'error' : 'default'}
                helperText={fieldErrors?.['non_secret.aws_region_name']}
              />
            ) : null}
          </div>
          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
        </Card>
      </Step>
    </Stepper>
  );
};
