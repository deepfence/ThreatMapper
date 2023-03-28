import { HiDocumentSearch, HiUsers } from 'react-icons/hi';
import { Tabs } from 'ui-components';

import { usePageNavigation } from '@/utils/usePageNavigation';

export const settingsTabs: Array<{
  label: string;
  value: 'diagnosis-logs' | 'user-management';
  icon?: React.ReactNode;
}> = [
  {
    label: 'Diagnostic Logs',
    value: 'diagnosis-logs',
    icon: <HiDocumentSearch />,
  },
  {
    label: 'User Management',
    value: 'user-management',
    icon: <HiUsers />,
  },
];

const UserManagement = () => {
  const { navigate } = usePageNavigation();

  return (
    <Tabs
      tabs={settingsTabs}
      value="user-management"
      size="sm"
      className="mt-2 px-2"
      onValueChange={(value) => {
        navigate(`/settings/${value}`);
      }}
    >
      <div className="h-full mt-2">User mana</div>
    </Tabs>
  );
};

export const module = {
  element: <UserManagement />,
};
