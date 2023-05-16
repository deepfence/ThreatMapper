import { useFetcher } from 'react-router-dom';
import { Button, TextInput } from 'ui-components';

import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import {
  ActionEnumType,
  ActionReturnType,
} from '@/features/settings/pages/UserManagement';

export const ChangePassword = () => {
  const fetcher = useFetcher<ActionReturnType>();
  const { data, state } = fetcher;

  if (data?.success) return <SuccessModalContent text="Password changed successfully!" />;
  return (
    <fetcher.Form
      method="post"
      className="flex flex-col gap-y-3 mt-2 pb-8 mx-8 w-[260px]"
    >
      <TextInput
        label="Old Password"
        type={'password'}
        placeholder="Old Password"
        name="old_password"
        color={data?.fieldErrors?.old_password ? 'error' : 'default'}
        sizing="sm"
        helperText={data?.fieldErrors?.old_password}
        required
      />
      <TextInput
        label="New Password"
        type={'password'}
        placeholder="New Password"
        name="new_password"
        sizing="sm"
        color={data?.fieldErrors?.new_password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.new_password}
        required
      />
      <TextInput
        label="Confirm Password"
        type={'password'}
        placeholder="Confirm Password"
        name="confirm_password"
        sizing="sm"
        color={data?.fieldErrors?.confirm_password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.confirm_password}
        required
      />

      <input
        type="text"
        name="_actionType"
        hidden
        readOnly
        value={ActionEnumType.CHANGE_PASSWORD}
      />
      <div className={`text-red-600 dark:text-red-500 text-sm`}>
        {!data?.success && data?.message && <span>{data.message}</span>}
      </div>

      <Button
        color="primary"
        size="sm"
        type="submit"
        className="mt-1 w-full"
        disabled={state !== 'idle'}
        loading={state !== 'idle'}
      >
        Change Password
      </Button>
    </fetcher.Form>
  );
};
