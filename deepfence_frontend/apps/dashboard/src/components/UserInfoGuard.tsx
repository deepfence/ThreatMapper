import { QueryObserver, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { Button, Modal, TextInput } from 'ui-components';

import { queryClient } from '@/queries/client';

const queryKey = 'user-info-guard-state';

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
  console.log('UserInfoGuard', { ...state.data });
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
  emailSuccess: boolean;
  licenseSuccess: boolean;
  error?: string;
  fieldErrors?: {
    email?: string;
    licenseKey?: string;
  };
}
const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'send-license') {
    return {
      emailSuccess: true,
      licenseSuccess: false,
    };
  } else if (intent === 'save-license') {
    return {
      emailSuccess: true,
      licenseSuccess: true,
    };
  } else {
    throw new Error('Invalid intent');
  }
};

const UserInfoModalContent = ({
  closeModal,
}: {
  closeModal: (success: boolean) => void;
}) => {
  const fetcher = useFetcher<ActionData>();
  const { data } = fetcher;

  useEffect(() => {
    if (data?.licenseSuccess) {
      closeModal(true);
    }
  }, [data]);

  return (
    <fetcher.Form action="/data-component/user-info-guard" method="POST">
      <div>
        Before you can perform this action, you need to register this ThreatMapper console
        with Deepfence. Please enter your details below to continue.
      </div>
      <input
        type="hidden"
        name="intent"
        value={data?.emailSuccess ? 'save-license' : 'send-license'}
      />
      <div className="mt-4 flex flex-col gap-3">
        <TextInput
          className="autofill:bg-transparent"
          label="Work Email"
          type={'text'}
          placeholder="name@example.com"
          name="email"
          color={data?.fieldErrors?.email ? 'error' : 'default'}
          helperText={data?.fieldErrors?.email}
          disabled={data?.emailSuccess}
        />
        {data?.emailSuccess ? (
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
        <div className={`text-center m-1.5 text-p7 dark:text-status-error`}>
          {data.error}
        </div>
      )}
      <div className="flex gap-x-3 justify-end mt-4">
        <Button
          size="md"
          variant="outline"
          type="button"
          onClick={() => {
            closeModal(false);
          }}
        >
          Cancel
        </Button>
        <Button
          size="md"
          type="submit"
          disabled={fetcher.state !== 'idle'}
          loading={fetcher.state !== 'idle'}
        >
          {data?.emailSuccess ? 'Save and continue' : 'Send verification email'}
        </Button>
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
