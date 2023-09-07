import { useState } from 'react';
import { Checkbox, TextInput } from 'ui-components';

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
    <>
      <div className="text-p4 dark:text-text-input-value">
        Connect to your Amazon ECR Registry. Find out more information by{' '}
        <DFLink
          href={`https://community.deepfence.io/threatmapper/docs/v2.0/registries/aws-ecr`}
          target="_blank"
          rel="noreferrer"
        >
          reading our documentation
        </DFLink>
        .
      </div>
      <p className="mt-6 text-p1 dark:text-text-input-value">Enter Information</p>
      <div className="w-full flex flex-col relative mt-4 gap-y-8">
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Registry Name"
          type={'text'}
          name="name"
          placeholder="Registry Name"
          color={fieldErrors?.['name'] ? 'error' : 'default'}
          helperText={fieldErrors?.['name']}
          required
        />
        <div className="flex flex-col gap-y-4">
          <input hidden value={String(isPublic)} name="non_secret.is_public" />
          <Checkbox
            label="Public Registry"
            checked={isPublic}
            onCheckedChange={(checked: boolean) => {
              setIsPublic(checked);
            }}
          />
          <input hidden value={String(useIAMRole)} name="non_secret.use_iam_role" />
          <Checkbox
            label="Use AWS IAM Role"
            checked={useIAMRole}
            onCheckedChange={(checked: boolean) => {
              setUseIAMRole(checked);
            }}
          />
        </div>
        <div className="flex flex-row gap-8 flex-wrap">
          {!useIAMRole ? (
            <>
              <TextInput
                className="grow min-[200px] max-w-xs"
                label="AWS Access Key"
                type={'text'}
                name="non_secret.aws_access_key_id"
                placeholder="AWS Access Key"
                color={fieldErrors?.['aws_access_key_id'] ? 'error' : 'default'}
                helperText={fieldErrors?.['aws_access_key_id']}
              />
              <TextInput
                className="grow min-[200px] max-w-xs"
                label="AWS Secret Key"
                type={'password'}
                name="secret.aws_secret_access_key"
                placeholder="AWS Secret Key"
                color={fieldErrors?.['aws_secret_access_key'] ? 'error' : 'default'}
                helperText={fieldErrors?.['aws_secret_access_key']}
              />
            </>
          ) : (
            <>
              <TextInput
                className="grow min-[200px] max-w-xs"
                label="AWS Account ID"
                type={'text'}
                name="non_secret.aws_account_id"
                placeholder="AWS Account ID"
                info="(Optional) Pull from registries belonging to other AWS Accounts"
                color={fieldErrors?.['aws_account_id'] ? 'error' : 'default'}
                helperText={fieldErrors?.['aws_account_id']}
              />
              <TextInput
                className="grow min-[200px] max-w-xs"
                label="Target Account Role ARN"
                type={'text'}
                name="non_secret.target_account_role_arn"
                placeholder="Target Account Role ARN"
                info="(Optional) Pull from registries belonging to other AWS Accounts"
                color={fieldErrors?.['target_account_role_arn'] ? 'error' : 'default'}
                helperText={fieldErrors?.['target_account_role_arn']}
              />
            </>
          )}
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="AWS Region"
            type={'text'}
            name="non_secret.aws_region_name"
            placeholder="AWS Region"
            color={fieldErrors?.['aws_region_name'] ? 'error' : 'default'}
            helperText={fieldErrors?.['aws_region_name']}
          />
        </div>
      </div>
      {errorMessage && (
        <p className="mt-4 dark:text-status-error text-p7">{errorMessage}</p>
      )}
    </>
  );
};
