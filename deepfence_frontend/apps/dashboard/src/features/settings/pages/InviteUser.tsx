import { IconContext } from 'react-icons';
import { HiArrowSmLeft } from 'react-icons/hi';
import { useFetcher } from 'react-router-dom';
import { ActionFunction, redirect } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, Select, SelectItem, TextInput, Typography } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelInviteUserRequestActionEnum,
  ModelInviteUserRequestRoleEnum,
  ModelUpdateUserIdRequestRoleEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';

export type inviteUserActionReturnType = {
  error?: string;
  fieldErrors?: {
    email?: string;
    role?: string;
  };
  message?: string;
  invite_url?: string;
  invite_expiry_hours?: number;
};

export const action: ActionFunction = async ({
  request,
}): Promise<inviteUserActionReturnType> => {
  const formData = await request.formData();
  // add console_url which is the origin of request
  formData.append('consoleUrl', window.location.origin);
  const body = Object.fromEntries(formData);

  const r = await makeRequest({
    apiFunction: getUserApiClient().inviteUser,
    apiArgs: [
      {
        modelInviteUserRequest: {
          action: body.intent as ModelInviteUserRequestActionEnum,
          email: body.email as string,
          role: body.role as ModelInviteUserRequestRoleEnum,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<inviteUserActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          fieldErrors: {
            email: modelResponse.error_fields?.email as string,
            role: modelResponse.error_fields?.role as string,
          },
        });
      } else if (r.status === 403) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          error: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }
  if (body.intent == ModelInviteUserRequestActionEnum['GetInviteLink']) {
    r.invite_url && navigator.clipboard.writeText(r.invite_url);
    toast.success('User Invite URL copied!!!');
    return r;
  }
  toast.success('User Invite Sent successfully');
  throw redirect('/settings/user-management', 302);
};

const InviteUser = () => {
  const fetcher = useFetcher<inviteUserActionReturnType>();
  const { data } = fetcher;
  return (
    <>
      <SettingsTab value="user-management">
        <div className="flex">
          <DFLink
            to="/settings/user-management"
            className="shrink-0 flex items-center justify-start hover:no-underline active:no-underline focus:no-underline ml-5 mr-2 mt-2"
          >
            <IconContext.Provider
              value={{
                className: 'text-blue-600 dark:text-blue-500 ',
              }}
            >
              <HiArrowSmLeft />
            </IconContext.Provider>
            <span className="text text-blue-600 dark:text-blue-500">Back</span>
          </DFLink>

          <span className="flex ml-2 mt-2 dark:text-white ">User Profile</span>
        </div>
        <Card className="flex-col p-5 mt-2 ml-5 gap-y-4">
          <fetcher.Form method="post" className="flex flex-col gap-y-3">
            <TextInput
              label="Email"
              type={'email'}
              placeholder="Email"
              name="email"
              color={data?.fieldErrors?.email ? 'error' : 'default'}
              sizing="sm"
              className="w-3/4 min-[200px] max-w-xs"
              required
              helperText={data?.fieldErrors?.email}
            />
            <div className="w-3/4 max-w-xs">
              <Select
                name="role"
                label={'Role'}
                placeholder="admin"
                sizing="xs"
                helperText={data?.fieldErrors?.role}
              >
                <SelectItem value={ModelUpdateUserIdRequestRoleEnum['Admin']}>
                  admin
                </SelectItem>
                <SelectItem value={ModelUpdateUserIdRequestRoleEnum['StandardUser']}>
                  User
                </SelectItem>
                <SelectItem value={ModelUpdateUserIdRequestRoleEnum['ReadOnlyUser']}>
                  read only user
                </SelectItem>
              </Select>
            </div>
            <Button
              color="primary"
              className="w-3/4 max-w-xs pl-3"
              size="sm"
              type="submit"
              name="intent"
              value={ModelInviteUserRequestActionEnum['SendInviteEmail']}
            >
              Send sign up request
            </Button>

            <Button
              color="primary"
              className="w-3/4 max-w-xs pl-3"
              type="submit"
              size="sm"
              name="intent"
              value={ModelInviteUserRequestActionEnum['GetInviteLink']}
            >
              Get an invite link
            </Button>
          </fetcher.Form>
          {data?.invite_url && (
            <p
              className={`mt-1.5 w-3/4 max-w-xs ${Typography.size.sm} text-green-500 relative`}
            >
              Invite URL:{data?.invite_url}, invite will expire after{' '}
              {data?.invite_expiry_hours} hours
            </p>
          )}
        </Card>
      </SettingsTab>
    </>
  );
};

export const module = {
  element: <InviteUser />,
  action,
};
