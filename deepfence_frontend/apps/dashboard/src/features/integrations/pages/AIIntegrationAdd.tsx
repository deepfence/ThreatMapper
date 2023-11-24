import { useState } from 'react';
import { ActionFunctionArgs, useFetcher, useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Listbox,
  ListboxOption,
  Radio,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  TextInput,
} from 'ui-components';

import { getGenerativeAIIntegraitonClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelAddGenerativeAiBedrockIntegrationAwsRegionEnum,
  ModelAddGenerativeAiBedrockIntegrationModelIdEnum,
  ModelAddGenerativeAiOpenAIIntegrationModelIdEnum,
} from '@/api/generated';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries } from '@/queries';
import { GenerativeAIIntegrationType } from '@/types/common';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

interface ActionData {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();

  const integrationType = formData
    .get('integration_type')
    ?.toString() as GenerativeAIIntegrationType;

  if (integrationType === 'openai') {
    const modelId = formData.get('model_id')?.toString() ?? '';
    const apiKey = formData.get('api_key')?.toString() ?? '';

    const addOpenAIIntegration = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().addGenerativeAiIntegrationOpenAI,
    });

    const response = await addOpenAIIntegration({
      modelAddGenerativeAiOpenAIIntegration: {
        model_id: modelId as ModelAddGenerativeAiOpenAIIntegrationModelIdEnum,
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
  } else if (integrationType === 'amazon-bedrock') {
    const modelId = formData.get('model_id')?.toString() ?? '';
    const awsRegion = formData.get('aws_region')?.toString() ?? '';
    const awsAccessKey = formData.get('aws_access_key')?.toString() ?? '';
    const awsSecretKey = formData.get('aws_secret_key')?.toString() ?? '';
    const useIAMRole = (formData.get('use_iam_role')?.toString() ?? '') === 'checked';

    const addGenerativeAiIntegrationBedrock = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().addGenerativeAiIntegrationBedrock,
    });

    const response = await addGenerativeAiIntegrationBedrock({
      modelAddGenerativeAiBedrockIntegration: {
        model_id: modelId as ModelAddGenerativeAiBedrockIntegrationModelIdEnum,
        aws_region: awsRegion as ModelAddGenerativeAiBedrockIntegrationAwsRegionEnum,
        aws_access_key: awsAccessKey,
        aws_secret_key: awsSecretKey,
        use_iam_role: useIAMRole,
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
  } else {
    throw new Error('invalid provider');
  }

  invalidateAllQueries();

  return {
    success: true,
  };
};

const AIIntegrationAdd = () => {
  const navigate = useNavigate();
  const fetcher = useFetcher<ActionData>();
  const [provider, setProvider] = useState<GenerativeAIIntegrationType>('openai');
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
            <div className="flex flex-col gap-2">
              <label
                htmlFor="genAIProviders"
                className="text-p3 text-gray-900 dark:text-text-text-and-icon"
              >
                Select Provider
              </label>
              <Radio
                id="genAIProviders"
                direction="row"
                options={
                  [
                    {
                      label: 'OpenAI',
                      value: 'openai',
                    },
                    {
                      label: 'Amazon Bedrock',
                      value: 'amazon-bedrock',
                    },
                  ] as Array<{ label: string; value: GenerativeAIIntegrationType }>
                }
                value={provider}
                onValueChange={(newVal) => {
                  setProvider(newVal as GenerativeAIIntegrationType);
                }}
                name="integration_type"
              />
            </div>
            {provider === 'openai' && <OpenAIFormFields fetcherData={fetcher.data} />}
            {provider === 'amazon-bedrock' && (
              <AmazonBedrockFormFields fetcherData={fetcher.data} />
            )}

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

const OpenAIFormFields = ({ fetcherData }: { fetcherData?: ActionData }) => {
  const [model, setModel] =
    useState<ModelAddGenerativeAiOpenAIIntegrationModelIdEnum | null>(null);

  return (
    <>
      <Listbox
        variant="underline"
        label="Model"
        placeholder="Please select model"
        name="model_id"
        value={model}
        onChange={(value) => {
          setModel(value);
        }}
        getDisplayValue={(value) => {
          if (value?.length) {
            return value;
          }
          return 'Select...';
        }}
        helperText={fetcherData?.fieldErrors?.['model_id']}
        color={fetcherData?.fieldErrors?.['model_id']?.length ? 'error' : 'default'}
      >
        {Object.keys(ModelAddGenerativeAiOpenAIIntegrationModelIdEnum).map((modelKey) => {
          return (
            <ListboxOption
              key={modelKey}
              value={
                ModelAddGenerativeAiOpenAIIntegrationModelIdEnum[
                  modelKey as keyof typeof ModelAddGenerativeAiOpenAIIntegrationModelIdEnum
                ]
              }
            >
              {
                ModelAddGenerativeAiOpenAIIntegrationModelIdEnum[
                  modelKey as keyof typeof ModelAddGenerativeAiOpenAIIntegrationModelIdEnum
                ]
              }
            </ListboxOption>
          );
        })}
      </Listbox>
      <TextInput
        label="API Key"
        type="password"
        name="api_key"
        helperText={fetcherData?.fieldErrors?.['api_key']}
        color={fetcherData?.fieldErrors?.['api_key']?.length ? 'error' : 'default'}
      />
    </>
  );
};

const AmazonBedrockFormFields = ({ fetcherData }: { fetcherData?: ActionData }) => {
  const [model, setModel] =
    useState<ModelAddGenerativeAiBedrockIntegrationModelIdEnum | null>(null);
  const [region, setRegion] =
    useState<ModelAddGenerativeAiBedrockIntegrationAwsRegionEnum | null>(null);
  const [useIAM, setUseIAM] = useState<boolean>(false);

  return (
    <>
      <Listbox
        variant="underline"
        label="Model"
        placeholder="Please select model"
        name="model_id"
        value={model}
        onChange={(value) => {
          setModel(value);
        }}
        getDisplayValue={(value) => {
          if (value?.length) {
            return value;
          }
          return 'Select...';
        }}
        helperText={fetcherData?.fieldErrors?.['model_id']}
        color={fetcherData?.fieldErrors?.['model_id']?.length ? 'error' : 'default'}
      >
        {Object.keys(ModelAddGenerativeAiBedrockIntegrationModelIdEnum).map(
          (modelKey) => {
            return (
              <ListboxOption
                key={modelKey}
                value={
                  ModelAddGenerativeAiBedrockIntegrationModelIdEnum[
                    modelKey as keyof typeof ModelAddGenerativeAiBedrockIntegrationModelIdEnum
                  ]
                }
              >
                {
                  ModelAddGenerativeAiBedrockIntegrationModelIdEnum[
                    modelKey as keyof typeof ModelAddGenerativeAiBedrockIntegrationModelIdEnum
                  ]
                }
              </ListboxOption>
            );
          },
        )}
      </Listbox>
      <Listbox
        variant="underline"
        label="Region"
        placeholder="Please select region"
        name="aws_region"
        value={region}
        onChange={(value) => {
          setRegion(value);
        }}
        getDisplayValue={(value) => {
          if (value?.length) {
            return value;
          }
          return 'Select...';
        }}
        helperText={fetcherData?.fieldErrors?.['aws_region']}
        color={fetcherData?.fieldErrors?.['aws_region']?.length ? 'error' : 'default'}
      >
        {Object.keys(ModelAddGenerativeAiBedrockIntegrationAwsRegionEnum).map(
          (modelKey) => {
            return (
              <ListboxOption
                key={modelKey}
                value={
                  ModelAddGenerativeAiBedrockIntegrationAwsRegionEnum[
                    modelKey as keyof typeof ModelAddGenerativeAiBedrockIntegrationAwsRegionEnum
                  ]
                }
              >
                {
                  ModelAddGenerativeAiBedrockIntegrationAwsRegionEnum[
                    modelKey as keyof typeof ModelAddGenerativeAiBedrockIntegrationAwsRegionEnum
                  ]
                }
              </ListboxOption>
            );
          },
        )}
      </Listbox>
      <Checkbox
        checked={useIAM}
        onCheckedChange={(val) => setUseIAM(val as boolean)}
        label="Use IAM for authentication"
        name="use_iam_role"
      />
      {!useIAM && (
        <>
          <TextInput
            label="Access Key"
            type="password"
            name="aws_access_key"
            helperText={fetcherData?.fieldErrors?.['aws_access_key']}
            color={
              fetcherData?.fieldErrors?.['aws_access_key']?.length ? 'error' : 'default'
            }
          />
          <TextInput
            label="Secret Key"
            type="password"
            name="aws_secret_key"
            helperText={fetcherData?.fieldErrors?.['aws_secret_key']}
            color={
              fetcherData?.fieldErrors?.['aws_secret_key']?.length ? 'error' : 'default'
            }
          />
        </>
      )}
    </>
  );
};

export const module = {
  element: <AIIntegrationAdd />,
  action,
};
