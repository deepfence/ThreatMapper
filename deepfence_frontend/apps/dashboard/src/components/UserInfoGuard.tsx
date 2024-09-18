import { QueryObserver, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { Button, Modal, TextInput } from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { DFLink } from '@/components/DFLink';
import { queryClient } from '@/queries/client';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { track } from '@/utils/track';

const queryKey = 'user-info-guard-state';
const SEND_EMAIL = 'send-email';
const SAVE_LICENSE = 'save-license';

let cachedValue = {
  open: false,
  userCancelled: false,
};

export const UserInfoGuard = () => {
  const state = useQuery({
    queryKey: [queryKey],
    queryFn: () => {
      return cachedValue;
    },
  });
  const queryClient = useQueryClient();
  if (state.status !== 'success') {
    return null;
  }
  return state.data?.open ? (
    <Modal
      title="Activate your console to continue..."
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          cachedValue = {
            open: false,
            userCancelled: true,
          };
          queryClient.invalidateQueries({
            queryKey: [queryKey],
          });
        }
      }}
    >
      <UserInfoModalContent
        closeModal={(success) => {
          cachedValue = {
            open: false,
            userCancelled: !success,
          };
          queryClient.invalidateQueries({
            queryKey: [queryKey],
          });
        }}
      />
    </Modal>
  ) : null;
};

interface ActionData {
  action: string;
  emailSuccess: {
    message?: string;
    success: boolean;
    generate_license_link?: string;
  };
  licenseSuccess: boolean;
  error?: string;
  fieldErrors?: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    licenseKey?: string;
  };
}
const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const intent = formData.get('intent')?.toString() ?? '';
  const resendIntent = formData.get('resendIntent');

  if (intent === SEND_EMAIL || resendIntent === SEND_EMAIL) {
    const apiFunctionApi = apiWrapper({
      fn: getSettingsApiClient().generateThreatMapperLicense,
    });
    const result = await apiFunctionApi({
      modelGenerateLicenseRequest: {
        first_name: formData.get('firstname') as string,
        last_name: formData.get('lastname') as string,
        company: formData.get('company') as string,
        email: formData.get('email') as string,
        resend_email: true, // lets keep this flag for future use
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        const { message, fieldErrors } = await getResponseErrors(result.error);
        return {
          action: intent,
          emailSuccess: {
            success: false,
            message,
          },
          licenseSuccess: false,
          fieldErrors: {
            firstname: fieldErrors?.first_name ?? '',
            email: fieldErrors?.email ?? '',
            lastname: fieldErrors?.last_name ?? '',
            company: fieldErrors?.company ?? '',
            licenseKey: fieldErrors?.license_key ?? '',
          },
          error: message,
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          action: intent,
          emailSuccess: {
            success: false,
            message,
          },
          licenseSuccess: false,
          fieldErrors: {},
          error: message,
        };
      }
      throw result.error;
    }
    return {
      action: intent,
      emailSuccess: {
        success: result.value.success,
        message: result.value.message,
        generate_license_link: result.value.generate_license_link,
      },
      licenseSuccess: false,
    };
  } else if (intent === SAVE_LICENSE) {
    const apiFunctionApi = apiWrapper({
      fn: getSettingsApiClient().registerThreatMapperLicense,
    });
    const result = await apiFunctionApi({
      modelRegisterLicenseRequest: {
        license_key: (formData.get('licenseKey') as string)?.trim(),
        email: formData.get('email') as string,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        const { message, fieldErrors } = await getResponseErrors(result.error);
        return {
          action: intent,
          emailSuccess: {
            success: true,
            message,
          },
          licenseSuccess: false,
          fieldErrors: {
            licenseKey: fieldErrors?.license_key ?? '',
          },
          error: message,
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          action: intent,
          emailSuccess: {
            success: true,
            message,
          },
          licenseSuccess: false,
          fieldErrors: {},
          error: message,
        };
      }
      throw result.error;
    }
    track({
      licenseKey: result.value.license_key,
      emailDomain: result.value.email_domain,
    });
  } else {
    throw new Error('Invalid intent');
  }
  return {
    action: intent,
    emailSuccess: {
      success: true,
      message: '',
    },
    licenseSuccess: true,
  };
};

const UserInfoModalContent = ({
  closeModal,
}: {
  closeModal: (success: boolean) => void;
}) => {
  const fetcher = useFetcher<ActionData>();
  const [isOnResendClick, setIsOnResendClick] = useState(false);
  const { data } = fetcher;

  useEffect(() => {
    if (data?.licenseSuccess) {
      closeModal(true);
    }
  }, [data]);

  const isLicenseLinkGenerated = useMemo(() => {
    return (
      data?.emailSuccess?.success === false &&
      data?.emailSuccess?.generate_license_link !== undefined &&
      data?.emailSuccess?.generate_license_link?.length > 0
    );
  }, [data]);
  const isLicenseAlreadyGenerated = useMemo(() => {
    return (
      data?.emailSuccess?.success === true &&
      data?.emailSuccess?.message !== undefined &&
      data?.emailSuccess?.message?.length > 0
    );
  }, [data]);

  return (
    <fetcher.Form action="/data-component/user-info-guard" method="POST">
      <div>
        Register your console to get vulnerability feeds and other appropriate rules.
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <TextInput
          className="autofill:bg-transparent"
          label="First Name"
          type="text"
          placeholder="firstname"
          name="firstname"
          color={data?.fieldErrors?.firstname ? 'error' : 'default'}
          helperText={data?.fieldErrors?.firstname}
          readOnly={isLicenseLinkGenerated || isLicenseAlreadyGenerated}
        />
        <TextInput
          className="autofill:bg-transparent"
          label="Last Name"
          type="text"
          placeholder="lastname"
          name="lastname"
          color={data?.fieldErrors?.lastname ? 'error' : 'default'}
          helperText={data?.fieldErrors?.lastname}
          readOnly={isLicenseLinkGenerated || isLicenseAlreadyGenerated}
        />
        <TextInput
          className="autofill:bg-transparent"
          label="Work Email"
          type={'text'}
          placeholder="name@example.com"
          name="email"
          color={data?.fieldErrors?.email ? 'error' : 'default'}
          helperText={data?.fieldErrors?.email}
          readOnly={isLicenseLinkGenerated || isLicenseAlreadyGenerated}
        />
        <TextInput
          className="autofill:bg-transparent"
          label="Company Name"
          type="text"
          placeholder="company"
          name="company"
          color={data?.fieldErrors?.company ? 'error' : 'default'}
          helperText={data?.fieldErrors?.company}
          readOnly={isLicenseLinkGenerated || isLicenseAlreadyGenerated}
        />

        {data?.emailSuccess?.success || isLicenseLinkGenerated ? (
          <TextInput
            className="autofill:bg-transparent"
            label="License Key"
            type={'text'}
            placeholder="Enter your license key"
            name="licenseKey"
            color={data?.fieldErrors?.licenseKey ? 'error' : 'default'}
            helperText={data?.fieldErrors?.licenseKey}
          />
        ) : null}
      </div>

      {data?.error && (
        <div className={`my-1.5 mr-1.5 text-p7 text-status-error`}>{data.error}</div>
      )}

      {isLicenseLinkGenerated ? (
        <div>
          <div className={`my-1.5 text-p7 text-text-text-and-icon`}>
            {data?.emailSuccess.message}
          </div>
          <DFLink
            href={data?.emailSuccess.generate_license_link}
            target="_blank"
            rel="noreferrer"
            className="break-words text-p7"
          >
            {data?.emailSuccess.generate_license_link}
          </DFLink>
        </div>
      ) : null}

      {isLicenseAlreadyGenerated ? (
        <div className={`my-1.5 mr-1.5 text-p7 text-status-info`}>
          {data?.emailSuccess?.message}
        </div>
      ) : null}

      {data?.emailSuccess?.success ? (
        <div className="flex mt-4 text-p4 text-text-text-and-icon gap-x-2">
          <input
            hidden
            value={SEND_EMAIL}
            name="resendIntent"
            readOnly
            disabled={!isOnResendClick}
          />
          <input hidden value={'true'} name="resend" readOnly />
          Not receiving license detail?{' '}
          <Button
            size="sm"
            className="p-0 tracking-normal"
            type="submit"
            variant="flat"
            data-testid="resendButton"
            disabled={
              fetcher.state !== 'idle' &&
              fetcher.formData?.get('resendIntent') === SEND_EMAIL
            }
            loading={
              fetcher.state !== 'idle' &&
              fetcher.formData?.get('resendIntent') === SEND_EMAIL
            }
            onClick={() => {
              setIsOnResendClick(true);
            }}
          >
            Resend now.
          </Button>
        </div>
      ) : null}

      <div className="flex gap-x-3 justify-end mt-4">
        <Button
          size="md"
          variant="outline"
          type="button"
          data-testid="cancelButton"
          onClick={() => {
            closeModal(false);
          }}
        >
          Cancel
        </Button>
        {data?.emailSuccess?.success || isLicenseLinkGenerated ? (
          <>
            <input hidden value={SAVE_LICENSE} name="intent" readOnly />
            <Button
              size="md"
              type="submit"
              data-testid="registerButton"
              disabled={
                fetcher.state !== 'idle' &&
                fetcher.formData?.get('intent') === SAVE_LICENSE &&
                fetcher.formData?.get('resendIntent') !== SEND_EMAIL
              }
              loading={
                fetcher.state !== 'idle' &&
                fetcher.formData?.get('intent') === SAVE_LICENSE &&
                fetcher.formData?.get('resendIntent') !== SEND_EMAIL
              }
              onClick={() => {
                setIsOnResendClick(false);
              }}
            >
              Register and continue
            </Button>
          </>
        ) : (
          <>
            <input hidden value={SEND_EMAIL} name="intent" readOnly />
            <Button
              size="md"
              type="submit"
              disabled={fetcher.state !== 'idle'}
              loading={fetcher.state !== 'idle'}
              data-testid="getLicenseKeyButton"
            >
              Get license key
            </Button>
          </>
        )}
      </div>
    </fetcher.Form>
  );
};

export function showUserInfoGuard() {
  cachedValue = {
    open: true,
    userCancelled: false,
  };
  queryClient.invalidateQueries({
    queryKey: [queryKey],
  });
}

const observer = new QueryObserver<typeof cachedValue>(queryClient, {
  queryKey: [queryKey],
});

export async function waitForUserInfoGuard() {
  return new Promise<boolean>((resolve) => {
    const unsubscribe = observer.subscribe((result) => {
      if (result.data && result.data.open === false) {
        resolve(!result.data.userCancelled);
        unsubscribe();
      }
    });
  });
}

export const module = {
  action,
};
