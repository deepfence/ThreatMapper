import { Suspense, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  HiLocationMarker,
  HiOutlineExclamationCircle,
  HiOutlineMail,
  HiServer,
  HiSun,
  HiTerminal,
} from 'react-icons/hi';
import { ActionFunctionArgs, useFetcher, useLoaderData } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  CircleSpinner,
  Modal,
  Select,
  SelectItem,
  TextInput,
} from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelEmailConfigurationAdd,
  ModelEmailConfigurationResp,
} from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

type AddEmailConfigurationReturnType = {
  error?: string;
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

export type ActionReturnType = {
  message?: string;
  success: boolean;
};

const emailProviders: { [key: string]: string } = {
  'Amazon SES': 'amazon_ses',
  'Google SMTP': 'smtp',
  SMTP: 'smtp',
};

enum ActionEnumType {
  DELETE = 'delete',
  ADD_CONFIGURATION = 'addConfiguration',
}

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const _actionType = formData.get('_actionType')?.toString();

  if (!_actionType) {
    return {
      message: 'Action Type is required',
      success: false,
    };
  }
  if (_actionType === ActionEnumType.DELETE) {
    const id = formData.get('id');
    const r = await makeRequest({
      apiFunction: getSettingsApiClient().deleteEmailConfiguration,
      apiArgs: [
        {
          configId: id as string,
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<ActionReturnType>({ success: false });
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

    toast('Email configuration deleted sucessfully');
  } else if (_actionType === ActionEnumType.ADD_CONFIGURATION) {
    const body = Object.fromEntries(formData);

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
        const error = new ApiError<AddEmailConfigurationReturnType>({ success: false });
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
      return {
        message: r.value().message,
        success: false,
      };
    }

    toast('Email configuration added sucessfully');
  }
  return {
    success: true,
  };
};
type LoaderDataType = {
  message?: string;
  data?: ModelEmailConfigurationResp[];
};
const getData = async (): Promise<LoaderDataType> => {
  const configurations = await makeRequest({
    apiFunction: getSettingsApiClient().getEmailConfiguration,
    apiArgs: [],
  });

  if (ApiError.isApiError(configurations)) {
    return {
      message: 'Error in getting email configuration',
    };
  }
  return {
    data: configurations,
  };
};
const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getData(),
  });
};

const EmailConfigurationModal = ({
  showDialog,
  setShowDialog,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<AddEmailConfigurationReturnType>();
  const { data } = fetcher;
  const [emailProvider, setEmailProvider] = useState<string>('Google SMTP');

  return (
    <Modal
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title="Add Email Configuration"
    >
      <fetcher.Form
        method="post"
        className="flex flex-col gap-y-3 mt-2 pb-8 mx-8 min-w-[384px]"
      >
        <input
          readOnly
          type="hidden"
          name="_actionType"
          value={ActionEnumType.ADD_CONFIGURATION}
        />
        <Select
          noPortal
          name="email_provider"
          label={'Email Provider'}
          placeholder="Email Provider"
          sizing="xs"
          onChange={(value) => setEmailProvider(value)}
          value={emailProvider}
        >
          <SelectItem value={'Google SMTP'}>Google SMTP</SelectItem>
          <SelectItem value={'Amazon SES'}>Amazon SES</SelectItem>
          <SelectItem value={'SMTP'}>SMTP</SelectItem>
        </Select>
        <TextInput
          label="Email"
          type={'email'}
          placeholder="Email"
          name="email_id"
          sizing="sm"
          required
        />
        {emailProvider !== 'Amazon SES' ? (
          <>
            <TextInput
              label="Password"
              type={'password'}
              placeholder="Password"
              name="password"
              sizing="sm"
              required
            />
            <TextInput
              label="Port"
              type={'number'}
              placeholder={
                emailProvider === 'SMTP' ? 'SMTP port (SSL)' : 'Gmail SMTP port (SSL)'
              }
              name="port"
              sizing="sm"
              required
            />
            <TextInput
              label="SMTP"
              type={'text'}
              placeholder="SMTP server"
              name="smtp"
              sizing="sm"
              required
            />
          </>
        ) : (
          <>
            <TextInput
              label="SES Region"
              type={'text'}
              placeholder="SES Region"
              name="ses_region"
              sizing="sm"
              required
            />
            <TextInput
              label="Amazon Access Key"
              type={'text'}
              placeholder="Amazon Access Key"
              name="amazon_access_key"
              sizing="sm"
              required
            />
            <TextInput
              label="Amazon Secret Key"
              type={'text'}
              placeholder="Amazon Secret Key"
              name="amazon_secret_key"
              sizing="sm"
              required
            />
          </>
        )}
        <div className={`text-red-600 dark:text-red-500 text-sm`}>
          {!data?.success && data?.message && <span>{data.message}</span>}
        </div>
        <Button color="primary" size="sm" type="submit">
          Submit
        </Button>
      </fetcher.Form>
    </Modal>
  );
};

const AddEmailConfigurationComponent = () => {
  const [openEmailConfiguration, setOpenEmailConfiguration] = useState(false);
  return (
    <div className="p-4 max-w-sm shadow-lg dark:bg-gray-800 rounded-md">
      <EmailConfigurationModal
        showDialog={openEmailConfiguration}
        setShowDialog={setOpenEmailConfiguration}
      />
      <h4 className="text-lg font-medium pb-2 dark:text-white">Configuration Setup</h4>
      <p className="text-base text-gray-500 dark:text-gray-400">
        Please connect an email provider in order to configure email, you can click on Add
        Configuration to set up email configurations
      </p>
      <Button
        size="sm"
        className="text-center mt-4 w-full"
        color="primary"
        type="button"
        onClick={() => setOpenEmailConfiguration(true)}
      >
        Add configurations
      </Button>
    </div>
  );
};

const EmailConfiguration = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <SettingsTab value="email-configuration">
      <div className="mt-2 flex gap-x-2 items-center">
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
          <IconContext.Provider
            value={{
              className: 'text-blue-600 dark:text-blue-400',
            }}
          >
            <HiOutlineMail />
          </IconContext.Provider>
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white text-base">
          Email Configuration
        </h3>
      </div>
      <div className="h-full mt-4 grid grid-flow-row-dense gap-y-8">
        <Suspense fallback={<CircleSpinner size="xs" />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data: configData = [], message } = resolvedData;
              const configuration: ModelEmailConfigurationResp = configData[0];
              return (
                <>
                  {configuration ? (
                    <>
                      <DeleteConfirmationModal
                        showDialog={showDeleteDialog}
                        id={String(configuration.id)}
                        setShowDialog={setShowDeleteDialog}
                      />
                      <div className="p-4 max-w-sm shadow-lg dark:bg-gray-800 rounded-md flex flex-col gap-y-3">
                        <div className="flex">
                          <div className="flex flex-col">
                            <span className="text-lg dark:text-gray-100 font-semibold">
                              Configurations
                            </span>
                          </div>
                        </div>
                        <div className="flex mt-2">
                          <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
                            <IconContext.Provider
                              value={{
                                className: 'w-4 h-4',
                              }}
                            >
                              <HiServer />
                            </IconContext.Provider>
                            Email Provider
                          </span>
                          <span className="text-sm dark:text-gray-100 font-semibold">
                            {configuration?.email_provider || '-'}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
                            <IconContext.Provider
                              value={{
                                className: 'w-4 h-4',
                              }}
                            >
                              <HiOutlineMail />
                            </IconContext.Provider>
                            Email Id
                          </span>
                          <span className="text-sm dark:text-gray-100 font-semibold">
                            {configuration?.email_id || '-'}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
                            <IconContext.Provider
                              value={{
                                className: 'w-4 h-4',
                              }}
                            >
                              <HiLocationMarker />
                            </IconContext.Provider>
                            Region
                          </span>
                          <span className="text-sm dark:text-gray-100 font-semibold">
                            {configuration?.ses_region || '-'}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
                            <IconContext.Provider
                              value={{
                                className: 'w-4 h-4',
                              }}
                            >
                              <HiTerminal />
                            </IconContext.Provider>
                            Port
                          </span>
                          <span className="text-sm dark:text-gray-100 font-semibold">
                            {configuration.port || '-'}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
                            <IconContext.Provider
                              value={{
                                className: 'w-4 h-4',
                              }}
                            >
                              <HiSun />
                            </IconContext.Provider>
                            SMTP
                          </span>
                          <span className="text-sm dark:text-gray-100 font-semibold">
                            {configuration.smtp || '-'}
                          </span>
                        </div>
                        <Button
                          color="danger"
                          size="sm"
                          className="mt-4"
                          type="button"
                          onClick={() => {
                            setShowDeleteDialog(true);
                          }}
                        >
                          Delete configurations
                        </Button>
                      </div>
                    </>
                  ) : (
                    <AddEmailConfigurationComponent />
                  )}
                </>
              );
            }}
          </DFAwait>
        </Suspense>
      </div>
    </SettingsTab>
  );
};

export const module = {
  element: <EmailConfiguration />,
  loader,
  action,
};

const DeleteConfirmationModal = ({
  showDialog,
  id,
  setShowDialog,
}: {
  showDialog: boolean;
  id: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data?.success) {
      setShowDialog(false);
    }
  }, [fetcher]);

  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <div className="grid place-items-center p-6">
        <IconContext.Provider
          value={{
            className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
          }}
        >
          <HiOutlineExclamationCircle />
        </IconContext.Provider>
        <h3 className="mb-4 font-normal text-center text-sm">
          Email configuration will be deleted.
          <br />
          <span>Are you sure you want to delete?</span>
        </h3>
        <div className="flex items-center justify-right gap-4">
          <Button size="xs" type="button" onClick={() => setShowDialog(false)} outline>
            No, Cancel
          </Button>
          <fetcher.Form method="post">
            <input readOnly type="hidden" name="id" value={id} />
            <input
              readOnly
              type="hidden"
              name="_actionType"
              value={ActionEnumType.DELETE}
            />
            <Button size="xs" color="danger" type="submit">
              Yes, I&apos;m sure
            </Button>
          </fetcher.Form>
        </div>
      </div>
    </Modal>
  );
};
