import { useFetcher } from 'react-router-dom';
import { Button, TextInput } from 'ui-components';

import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { ActionData } from '@/features/settings/pages/UserManagement';

enum ActionEnumType {
  CHANGE_PASSWORD = 'changePassword',
}
export const ChangePassword = ({ onCancel }: { onCancel: () => void }) => {
  const fetcher = useFetcher<ActionData>();
  const { data, state } = fetcher;

  if (data?.success) return <SuccessModalContent text="Password changed successfully" />;
  return (
    <fetcher.Form method="post" className="flex flex-col gap-y-8 mt-4 mx-4">
      <TextInput
        label="Current Password"
        type={'password'}
        placeholder="Current Password"
        name="old_password"
        color={data?.fieldErrors?.old_password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.old_password}
        required
      />
      <TextInput
        label="New Password"
        type={'password'}
        placeholder="New Password"
        name="new_password"
        color={data?.fieldErrors?.new_password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.new_password}
        required
      />
      <TextInput
        label="Confirm new Password"
        type={'password'}
        placeholder="Confirm new Password"
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

      {!data?.success && data?.message && (
        <div className={`text-red-600 text-status-error text-p7`}>
          <span>{data.message}</span>{' '}
        </div>
      )}

      <div className="flex gap-x-2 mt-6">
        <Button
          size="md"
          type="submit"
          className=" w-fit"
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
        >
          Submit
        </Button>
        <Button size="md" onClick={() => onCancel()} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </fetcher.Form>
  );
};
