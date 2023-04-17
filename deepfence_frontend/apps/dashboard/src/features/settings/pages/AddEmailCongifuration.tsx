import { useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { redirect } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, Select, SelectItem, TextInput } from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelEmailConfigurationAdd } from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';

type fieldErrorsType = {
  amazon_access_key?: string;
  amazon_secret_key?: string;
  created_by_user_id?: string;
  email_id?: string;
  email_provider?: string;
  password?: string;
  port?: string;
  ses_region?: string;
  smtp?: string;
};

export type addEmailConfigurationReturnType = {
  error?: string;
  fieldErrors?: fieldErrorsType;
  message?: string;
  success?: boolean;
  amazon_access_key?: string;
  amazon_secret_key?: string;
  created_by_user_id?: string;
  email_id?: string;
  email_provider?: string;
  password?: string;
  port?: string;
  ses_region?: string;
  smtp?: string;
};

interface emailProvidersType {
  [key: string]: string;
}
const emailProviders: emailProvidersType = {
  'Amazon SES': 'amazon_ses',
  'Google SMTP': 'smtp',
  SMTP: 'smtp',
};
export const action = async ({
  request,
}: ActionFunctionArgs): Promise<addEmailConfigurationReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const fieldErrors: fieldErrorsType = {};
  const helperTextMap: fieldErrorsType = {
    amazon_access_key: 'Amazon access key',
    amazon_secret_key: 'Amazon secret key',
    email_id: 'Email id',
    email_provider: 'Email provider',
    password: 'Password',
    port: 'Port',
    ses_region: 'SES region',
    smtp: 'SMTP server',
  };
  Object.keys(body).forEach((key) => {
    if (!body[key]) {
      fieldErrors[key as keyof fieldErrorsType] = `${
        helperTextMap[key as keyof fieldErrorsType]
      } is required`;
    }
  });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }
  const emailProvider = body.email_provider as string;
  const data: ModelEmailConfigurationAdd = {
    email_provider: emailProviders[emailProvider],
    email_id: body.email_id as string,
  };
  if (emailProvider === 'Amazon SES') {
    data.amazon_access_key = body.amazon_access_key as string;
    data.amazon_secret_key = body.amazon_secret_key as string;
    data.ses_region = body.ses_region as string;
  } else {
    data.smtp = body.smtp as string;
    data.port = body.port as string;
    data.password = body.password as string;
  }
  const r = await makeRequest({
    apiFunction: getSettingsApiClient().addEmailConfiguration,
    apiArgs: [
      {
        modelEmailConfigurationAdd: data,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<addEmailConfigurationReturnType>({ success: false });
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
          success: false,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  toast('Email configuration added sucessfully');
  throw redirect('/settings/email-configuration', 302);
};

const AddEmailCongifuration = () => {
  const fetcher = useFetcher<addEmailConfigurationReturnType>();
  const { data } = fetcher;
  const [emailProvider, setEmailProvider] = useState<string>('Google SMTP');
  const onChange = (value: string) => {
    setEmailProvider(value);
  };
  const isAmazonEmailProvider = emailProvider === 'Amazon SES';
  const placeholder =
    emailProvider === 'SMTP' ? 'SMTP port (SSL)' : 'Gmail SMTP port (SSL)';

  return (
    <>
      <SettingsTab value="email-configuration">
        <div className="flex">
          <span className="flex ml-6 mt-2 dark:text-white ">Add Email Configuration</span>
        </div>
        <Card className="flex-col p-5 mt-2 ml-5 gap-y-4">
          <div className="w-3/4 max-w-xs">
            <fetcher.Form method="post" className="flex flex-col gap-y-3">
              <Select
                name="email_provider"
                label={'Email Provider'}
                placeholder="Email Provider"
                sizing="xs"
                helperText={data?.fieldErrors?.email_provider}
                onChange={onChange}
                value={emailProvider}
              >
                <SelectItem value={'Google SMTP'}>Google SMTP</SelectItem>
                <SelectItem value={'Amazon SES'}>Amazon SES</SelectItem>
                <SelectItem value={'SMTP'}>SMTP</SelectItem>
              </Select>
              <TextInput
                label="Emial"
                type={'email'}
                placeholder="Email"
                name="email_id"
                color={data?.fieldErrors?.email_id ? 'error' : 'default'}
                sizing="sm"
                required
                helperText={data?.fieldErrors?.email_id}
              />
              {!isAmazonEmailProvider ? (
                <>
                  <TextInput
                    label="Password"
                    type={'password'}
                    placeholder="Password"
                    name="password"
                    color={data?.fieldErrors?.password ? 'error' : 'default'}
                    sizing="sm"
                    required
                    helperText={data?.fieldErrors?.password}
                  />
                  <TextInput
                    label="Port"
                    type={'number'}
                    placeholder={placeholder}
                    name="port"
                    color={data?.fieldErrors?.port ? 'error' : 'default'}
                    sizing="sm"
                    required
                    helperText={data?.fieldErrors?.port}
                  />
                  <TextInput
                    label="SMTP"
                    type={'text'}
                    placeholder="SMTP server"
                    name="smtp"
                    color={data?.fieldErrors?.smtp ? 'error' : 'default'}
                    sizing="sm"
                    required
                    helperText={data?.fieldErrors?.smtp}
                  />
                </>
              ) : (
                <>
                  <TextInput
                    label="SES Region"
                    type={'text'}
                    placeholder="SES Region"
                    name="ses_region"
                    color={data?.fieldErrors?.ses_region ? 'error' : 'default'}
                    sizing="sm"
                    required
                    helperText={data?.fieldErrors?.ses_region}
                  />
                  <TextInput
                    label="Amazon Access Key"
                    type={'text'}
                    placeholder="Amazon Access Key"
                    name="amazon_access_key"
                    color={data?.fieldErrors?.amazon_access_key ? 'error' : 'default'}
                    sizing="sm"
                    required
                    helperText={data?.fieldErrors?.amazon_access_key}
                  />
                  <TextInput
                    label="Amazon Secret Key"
                    type={'text'}
                    placeholder="Amazon Secret Key"
                    name="amazon_secret_key"
                    color={data?.fieldErrors?.amazon_secret_key ? 'error' : 'default'}
                    sizing="sm"
                    required
                    helperText={data?.fieldErrors?.amazon_secret_key}
                  />
                </>
              )}

              <Button color="primary" size="sm" type="submit">
                Save Changes
              </Button>
            </fetcher.Form>
          </div>
        </Card>
      </SettingsTab>
    </>
  );
};

export const module = {
  element: <AddEmailCongifuration />,
  action,
};
