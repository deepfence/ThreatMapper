import { useState } from 'react';
import { ActionFunctionArgs, useFetcher, useNavigate } from 'react-router-dom';
import {
  Button,
  Listbox,
  ListboxOption,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  TextInput,
} from 'ui-components';

import { getIntegrationApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelAddAiIntegrationRequestIntegrationTypeEnum,
} from '@/api/generated';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries } from '@/queries';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

interface ActionData {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();

  const integrationType = formData.get('integration_type')?.toString() ?? '';
  const apiKey = formData.get('api_key')?.toString() ?? '';

  const addAIIntegration = apiWrapper({
    fn: getIntegrationApiClient().addAIIntegration,
  });

  const response = await addAIIntegration({
    modelAddAiIntegrationRequest: {
      integration_type:
        integrationType as ModelAddAiIntegrationRequestIntegrationTypeEnum,
      api_key: apiKey,
    },
  });

  if (!response.ok) {
    if (response.error.response.status === 400) {
      const modelResponse: ApiDocsBadRequestResponse =
        await response.error.response.json();

      return {
        success: false,
        message: modelResponse.message ?? '',
        fieldErrors: modelResponse.error_fields ?? {},
      };
    } else if (response.error.response.status === 403) {
      const message = await get403Message(response.error);
      return {
        success: false,
        message,
      };
    }
    throw response.error;
  }

  invalidateAllQueries();

  return {
    success: true,
  };
};

const AIIntegrationAdd = () => {
  const navigate = useNavigate();
  const fetcher = useFetcher<ActionData>();
  const [provider, setProvider] = useState<string | null>(null);
  return (
    <SlidingModal
      open
      onOpenChange={(open) => {
        if (!open) navigate('..');
      }}
    >
      <SlidingModalCloseButton />
      <SlidingModalHeader>
        <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-breadcrumb-bar">
          Add Generative AI Integration
        </div>
      </SlidingModalHeader>
      <SlidingModalContent>
        {!fetcher.data?.success ? (
          <fetcher.Form method="POST" className="flex flex-col gap-8 m-4">
            {fetcher.data?.message && (
              <p className="dark:text-status-error text-p7">{fetcher.data?.message}</p>
            )}
            <Listbox
              variant="underline"
              label="Provider"
              placeholder="Please select provider"
              name="integration_type"
              value={provider}
              onChange={(value) => {
                setProvider(value);
              }}
              getDisplayValue={(value) => {
                if (value === ModelAddAiIntegrationRequestIntegrationTypeEnum.Openai) {
                  return 'OpenAI';
                }
                return 'Select...';
              }}
              helperText={fetcher.data?.fieldErrors?.['integration_type']}
              color={
                fetcher.data?.fieldErrors?.['integration_type']?.length
                  ? 'error'
                  : 'default'
              }
            >
              <ListboxOption
                value={ModelAddAiIntegrationRequestIntegrationTypeEnum.Openai}
              >
                OpenAI
              </ListboxOption>
            </Listbox>
            <TextInput
              label="API Key"
              type="password"
              name="api_key"
              helperText={fetcher.data?.fieldErrors?.['api_key']}
              color={fetcher.data?.fieldErrors?.['api_key']?.length ? 'error' : 'default'}
            />
            <div className="mt-2 flex gap-x-2 p-1">
              <Button
                size="md"
                color="default"
                type="submit"
                loading={fetcher.state === 'submitting'}
                disabled={fetcher.state === 'submitting'}
              >
                Add
              </Button>
              <Button
                type="button"
                size="md"
                color="default"
                variant="outline"
                onClick={() => navigate('..')}
              >
                Cancel
              </Button>
            </div>
          </fetcher.Form>
        ) : (
          <SuccessModalContent text="Integration added successfully." />
        )}
      </SlidingModalContent>
    </SlidingModal>
  );
};

export const module = {
  element: <AIIntegrationAdd />,
  action,
};
