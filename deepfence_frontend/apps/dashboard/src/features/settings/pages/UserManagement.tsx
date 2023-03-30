import { SettingsTab } from '@/features/settings/components/SettingsTab';

const UserManagement = () => {
  return (
    <SettingsTab value="user-management">
      <div className="h-full mt-2">User management</div>
    </SettingsTab>
  );
};

export const module = {
  element: <UserManagement />,
};
