import { isNil } from 'lodash-es';
import { useState } from 'react';
import { useFetcher } from 'react-router-dom';
import { Button, Checkbox, Radio, TextInput } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';

import { ActionEnumType } from '../pages/IntegrationAdd';
import { NotificationTypeField } from './integration-form/NotificationTypeField';
import { TextInputType } from './integration-form/TextInputType';
import {
  getIntegrationPrettyName,
  IntegrationDocsLinkMap,
  IntegrationKeyType,
  IntegrationType,
} from './integration-form/utils';

interface IntegrationTypeProps {
  integrationType: IntegrationKeyType;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
  data?: ModelIntegrationListResp;
}

// const UserActivityIntegration: string[] = [
//   IntegrationType.splunk,
//   IntegrationType.sumoLogic,
//   IntegrationType.elasticsearch,
//   IntegrationType.googleChronicle,
//   IntegrationType.awsSecurityHub,
//   IntegrationType.jira,
//   IntegrationType.s3,
// ];

// const CloudTrailIntegration: string[] = [
//   IntegrationType.slack,
//   IntegrationType.pagerDuty,
//   IntegrationType.email,
//   IntegrationType.httpEndpoint,
//   IntegrationType.microsoftTeams,
//   IntegrationType.splunk,
//   IntegrationType.sumoLogic,
//   IntegrationType.elasticsearch,
//   IntegrationType.googleChronicle,
//   IntegrationType.awsSecurityHub,
// ];

export const IntegrationForm = ({
  integrationType,
  setOpenModal,
  data: formData,
}: IntegrationTypeProps) => {
  const fetcher = useFetcher<{
    message: string;
    success: boolean;
    fieldErrors?: Record<string, string>;
  }>();
  const { data } = fetcher;
  const fieldErrors = data?.fieldErrors ?? {};

  // for jira
  const [authType, setAuthType] = useState(() => {
    return formData?.config?.isAuthToken ? 'apiToken' : 'password';
  });

  // for aws security hub
  const [awsAccounts, setAccounts] = useState<string[]>(() => {
    return formData?.config?.aws_account_id ?? [];
  });

  // for s3
  const [useIAMRole, setUseIAMRole] = useState<boolean>(() => {
    return formData?.config?.use_iam_role === 'true';
  });

  const docLink = IntegrationDocsLinkMap[integrationType];

  return (
    <>
      {!data?.success ? (
        <fetcher.Form method="post" className="m-4 overflow-y-auto">
          {docLink && docLink.trim().length > 0 ? (
            <div className="text-p4a text-text-input-value pb-4">
              Integrate with {getIntegrationPrettyName(integrationType)}. Find out more
              information by{' '}
              <DFLink href={docLink} target="_blank" rel="noreferrer">
                reading our documentation
              </DFLink>
              .
            </div>
          ) : null}

          <input type="text" name="integrationId" hidden readOnly value={formData?.id} />
          <div className="grid grid-cols-2 relative gap-y-8 gap-x-8">
            {integrationType === IntegrationType.slack && (
              <>
                <TextInputType
                  name="url"
                  label="Webhook Url"
                  placeholder="Slack webhook url"
                  helperText={
                    fieldErrors?.webhook_url ??
                    'Ex. https://hooks.slack.com/services/T0000/B00000/XXXXXXXXX'
                  }
                  color={fieldErrors?.webhook_url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.channel}
                  name="channelName"
                  label="Channel Name"
                  placeholder="Slack channel"
                  helperText={fieldErrors?.channel}
                  color={fieldErrors?.channel ? 'error' : 'default'}
                  required
                />
              </>
            )}
            {integrationType === IntegrationType.pagerDuty && (
              <>
                <TextInputType
                  name="integrationKey"
                  label="Integration Key"
                  placeholder="Integration key"
                  helperText={fieldErrors?.service_key}
                  color={fieldErrors?.service_key ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  name="apiKey"
                  label="Api Key"
                  placeholder="Api key"
                  helperText={fieldErrors?.api_key}
                  color={fieldErrors?.api_key ? 'error' : 'default'}
                  required
                />
              </>
            )}
            {integrationType === IntegrationType.email && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.email_id}
                  name="email"
                  label="Email Id"
                  placeholder="Email id"
                  helperText={fieldErrors?.email_id}
                  color={fieldErrors?.email_id ? 'error' : 'default'}
                  required
                />
              </>
            )}
            {integrationType === IntegrationType.httpEndpoint && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.url}
                  name="apiUrl"
                  label="API Url"
                  placeholder="API url"
                  helperText={fieldErrors?.url}
                  color={fieldErrors?.url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  name="auth_header"
                  label="Authorization Header"
                  placeholder="Authorization header"
                  helperText={fieldErrors?.auth_key}
                  color={fieldErrors?.auth_key ? 'error' : 'default'}
                />
              </>
            )}
            {integrationType === IntegrationType.microsoftTeams && (
              <>
                <TextInputType
                  name="url"
                  label="Webhook Url"
                  placeholder="Webhook url"
                  helperText={
                    fieldErrors?.webhook_url ??
                    'Ex. https://myteam.webhook.office.com/webhookb2/a1b1c1d1/XXX/XXXX'
                  }
                  color={fieldErrors?.webhook_url ? 'error' : 'default'}
                  required
                />
              </>
            )}

            {integrationType === IntegrationType.splunk && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.endpoint_url}
                  name="url"
                  label="Endpoint Url"
                  placeholder="Endpoint url"
                  helperText={
                    fieldErrors?.endpoint_url ??
                    'Ex. https://[splunkEndpoint]:8089/services/receivers/simpleVersion: 7.1'
                  }
                  color={fieldErrors?.endpoint_url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  name="token"
                  label="Receiver Token"
                  placeholder="Receiver token"
                  helperText={fieldErrors?.token}
                  color={fieldErrors?.token ? 'error' : 'default'}
                  required
                />
              </>
            )}

            {integrationType === IntegrationType.sumoLogic && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.endpoint_url}
                  name="url"
                  label="Endpoint Url"
                  placeholder="Endpoint url"
                  helperText={
                    fieldErrors?.http_endpoint ??
                    'Ex. https://[SumoEndpoint]/receiver/v1/http/[UniqueHTTPCollectorCode]'
                  }
                  color={fieldErrors?.http_endpoint ? 'error' : 'default'}
                  required
                />
              </>
            )}

            {integrationType === IntegrationType.elasticsearch && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.endpoint_url}
                  name="url"
                  label="Endpoint Url"
                  placeholder="Elasticsearch endpoint url"
                  helperText={fieldErrors?.endpoint_url ?? 'Version: 5.x and above'}
                  color={fieldErrors?.endpoint_url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.index}
                  name="index"
                  label="Index"
                  placeholder="Elasticsearch index"
                  helperText={fieldErrors?.index}
                  color={fieldErrors?.index ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.docType}
                  name="docType"
                  label="Doc Type"
                  placeholder="Elasticsearch doc type"
                  helperText={fieldErrors?.doc_type}
                  color={fieldErrors?.doc_type ? 'error' : 'default'}
                />
                <TextInputType
                  defaultValue={formData?.config?.auth_header}
                  name="authKey"
                  label="Auth Key"
                  placeholder="Auth key"
                  helperText={fieldErrors?.auth_key}
                  color={fieldErrors?.auth_key ? 'error' : 'default'}
                />
              </>
            )}

            {integrationType === IntegrationType.googleChronicle && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.url}
                  name="url"
                  label="API Url"
                  placeholder="Api url"
                  helperText={fieldErrors?.url}
                  color={fieldErrors?.url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.auth_header}
                  name="authKey"
                  label="Auth Key"
                  placeholder="Auth key"
                  helperText={fieldErrors?.auth_key}
                  color={fieldErrors?.auth_key ? 'error' : 'default'}
                />
              </>
            )}

            {integrationType === IntegrationType.awsSecurityHub && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.aws_access_key}
                  name="accessKey"
                  required
                  label="Access Key"
                  placeholder="AWS access key"
                  helperText={fieldErrors?.aws_access_key}
                  color={fieldErrors?.aws_access_key ? 'error' : 'default'}
                />
                <TextInputType
                  name="secretKey"
                  label="Secret Key"
                  required
                  placeholder="AWS secret key"
                  helperText={fieldErrors?.aws_secret_key}
                  color={fieldErrors?.aws_secret_key ? 'error' : 'default'}
                  type="password"
                />
                <TextInputType
                  defaultValue={formData?.config?.aws_region}
                  name="region"
                  required
                  label="Region"
                  placeholder="AWS region"
                  helperText={fieldErrors?.aws_region}
                  color={fieldErrors?.aws_region ? 'error' : 'default'}
                />
                <SearchableCloudAccountsList
                  label="AWS Account"
                  triggerVariant="select"
                  defaultSelectedAccounts={awsAccounts}
                  cloudProvider="aws"
                  valueKey="nodeName"
                  onChange={(value) => {
                    setAccounts(value);
                  }}
                  helperText={fieldErrors?.aws_account_id}
                  color={fieldErrors?.aws_account_id ? 'error' : 'default'}
                />
              </>
            )}

            {integrationType === IntegrationType.jira && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.jiraSiteUrl}
                  name="url"
                  label="Jira Url"
                  placeholder="Jira site url"
                  helperText={
                    fieldErrors?.jira_site_url ??
                    'Ex. https://[organization].atlassian.net/Version: 7.13'
                  }
                  color={fieldErrors?.jira_site_url ? 'error' : 'default'}
                  required
                />
                <Radio
                  name="authTypeRadio"
                  direction="row"
                  value={authType}
                  options={[
                    {
                      label: 'API Token',
                      value: 'apiToken',
                    },
                    {
                      label: 'Password',
                      value: 'password',
                    },
                  ]}
                  onValueChange={(value) => {
                    setAuthType(value);
                  }}
                />
                <TextInputType
                  name="authType"
                  label={authType === 'password' ? 'Password' : 'Api Token'}
                  helperText={
                    authType === 'password'
                      ? fieldErrors?.password
                      : fieldErrors?.api_token
                  }
                  color={
                    fieldErrors?.password || fieldErrors?.api_token ? 'error' : 'default'
                  }
                  type={authType === 'password' ? 'password' : 'text'}
                  placeholder={authType === 'password' ? 'password' : 'Api token'}
                  key={authType}
                />
                <TextInputType
                  defaultValue={formData?.config?.username}
                  name="email"
                  label="Email"
                  helperText={fieldErrors?.username}
                  color={fieldErrors?.username ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.jiraProjectKey}
                  name="accessKey"
                  label="Project Key"
                  placeholder="Jira project key"
                  helperText={fieldErrors?.jira_project_key}
                  color={fieldErrors?.jira_project_key ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.issueType}
                  name="task"
                  label="Task Name"
                  placeholder="Bugs, task, etc"
                  helperText={fieldErrors?.issue_type ?? 'Case sensitive'}
                  color={fieldErrors?.issue_type ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.jiraAssignee}
                  name="assigne"
                  label="Assignee"
                  placeholder="Jira assigne"
                  helperText={fieldErrors?.jira_assignee}
                  color={fieldErrors?.jira_assignee ? 'error' : 'default'}
                />
              </>
            )}

            {integrationType === IntegrationType.s3 && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.s3_bucket_name}
                  name="name"
                  label="Bucket Name"
                  placeholder="S3 bucket name"
                  helperText={fieldErrors?.s3_bucket_name}
                  color={fieldErrors?.s3_bucket_name ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.s3_folder_name}
                  name="folder"
                  label={'Folder'}
                  placeholder="S3 folder"
                  helperText={fieldErrors?.s3_folder_name}
                  color={fieldErrors?.s3_folder_name ? 'error' : 'default'}
                  required
                />
                <TextInput
                  defaultValue={formData?.config?.aws_account_id}
                  name="awsAccount"
                  label="AWS Account ID"
                  placeholder="AWS account id"
                  required
                  info="S3 belonging to other AWS Accounts"
                  helperText={fieldErrors?.aws_account_id}
                  color={fieldErrors?.aws_account_id ? 'error' : 'default'}
                />
                <TextInputType
                  defaultValue={formData?.config?.aws_region}
                  name="region"
                  label="Region"
                  placeholder="AWS region"
                  helperText={fieldErrors?.aws_region}
                  color={fieldErrors?.aws_region ? 'error' : 'default'}
                  required
                />
                <div className="col-span-2">
                  <Checkbox
                    label="Use AWS IAM Role"
                    key="useIAMRole"
                    name="useIAMRole"
                    checked={useIAMRole}
                    onCheckedChange={(checked: boolean) => {
                      setUseIAMRole(checked);
                    }}
                  />
                </div>
                {useIAMRole ? (
                  <TextInput
                    defaultValue={formData?.config?.target_account_role_arn}
                    name="awsARN"
                    label="Target Account Role ARN"
                    placeholder="Target account role arn"
                    info="S3 belonging to other AWS Accounts"
                    helperText={fieldErrors?.target_account_role_arn}
                    color={fieldErrors?.target_account_role_arn ? 'error' : 'default'}
                  />
                ) : (
                  <>
                    <TextInputType
                      defaultValue={formData?.config?.aws_access_key}
                      name="accessKey"
                      label="Access Key"
                      placeholder="AWS access key"
                      helperText={fieldErrors?.aws_access_key}
                      color={fieldErrors?.aws_access_key ? 'error' : 'default'}
                    />
                    <TextInputType
                      name="secretKey"
                      label="Secret Key"
                      placeholder="AWS secret key"
                      helperText={fieldErrors?.aws_secret_key}
                      color={fieldErrors?.aws_secret_key ? 'error' : 'default'}
                    />
                  </>
                )}
              </>
            )}

            <NotificationTypeField
              defaultNotificationType={formData?.notification_type ?? ''}
              data={formData}
            />

            <input
              type="text"
              name="_actionType"
              readOnly
              hidden
              value={isNil(formData) ? ActionEnumType.ADD : ActionEnumType.EDIT}
            />
            {data?.message && <p className="text-status-error text-p7">{data.message}</p>}
          </div>
          <div className="mt-14 flex gap-x-2 p-1">
            <Button
              size="md"
              color="default"
              type="submit"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
            >
              {isNil(formData) ? 'Add' : 'Update'}
            </Button>
            <Button
              type="button"
              size="md"
              color="default"
              variant="outline"
              onClick={() => setOpenModal(false)}
            >
              Cancel
            </Button>
          </div>
        </fetcher.Form>
      ) : (
        <SuccessModalContent text={`${formData ? 'Updated' : 'Added'} successfully`} />
      )}
    </>
  );
};
