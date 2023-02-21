import { SetStateAction, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Tabs } from 'ui-components';

const settingsLayoutTabs: Array<{
  label: string;
  value: string;
}> = [
  {
    label: 'License Details',
    value: 'license-details',
  },
  {
    label: 'Scheduled Jobs',
    value: 'scheduled-jobs',
  },
  {
    label: 'User Management',
    value: 'user-management',
  },
];

export const Settings = () => {
  const [tab, setTab] = useState('license-details');
  const navigateTabs = useNavigate();

  const handleTabChange = (newTab: SetStateAction<string>) => {
    setTab(newTab);
    navigateTabs(`/settings/${newTab}`);
  };

  return (
    <div className="flex flex-col space-y-8">
      <Tabs
        tabs={settingsLayoutTabs}
        size="md"
        value={tab}
        onValueChange={handleTabChange}
      >
        <div className="mt-8">
          <Outlet />
        </div>
      </Tabs>
    </div>
  );
};

export const module = {
  element: <Settings />,
};
