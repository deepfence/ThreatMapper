import { useFetcher } from 'react-router-dom';
import { Button, TextInput } from 'ui-components';

import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import {
  ActionEnumType,
  ActionReturnType,
} from '@/features/settings/pages/UserManagement';

export const ChangePassword = ({ onCancel }: { onCancel: () => void }) => {
  const fetcher = useFetcher<ActionReturnType>();
  const { data, state } = fetcher;

  if (data?.success) return <SuccessModalContent text="Password changed successfully!" />;
  return (
    <fetcher.Form method="post" className="flex flex-col gap-y-8 mt-4 mx-4">
      <TextInput
        className="mt-8"
        label="Old Password"
        type={'password'}
        placeholder="Old Password"
        name="old_password"
        color={data?.fieldErrors?.old_password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.old_password}
        required
      />
      <TextInput
        className="mt-8"
        label="New Password"
        type={'password'}
        placeholder="New Password"
        name="new_password"
        color={data?.fieldErrors?.new_password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.new_password}
        required
      />
      <TextInput
        className="mt-8"
        label="Confirm Password"
        type={'password'}
        placeholder="Confirm Password"
        name="confirm_password"
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
      <div className={`text-red-600 dark:text-status-error mt-4 text-p7`}>
        {!data?.success && data?.message && <span>{data.message}</span>}
      </div>

      <div className="flex gap-x-2">
        <Button
          size="sm"
          type="submit"
          className=" w-fit"
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
        >
          Submit
        </Button>
        <Button onClick={() => onCancel()} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </fetcher.Form>
  );
};
