import { useState } from 'react';
import { HiDocumentSearch } from 'react-icons/hi';
import { Link, Outlet, useLocation } from 'react-router-dom';
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
  },
];

const Settings = () => {
  const { navigate } = usePageNavigation();
  const [tab, setTab] = useState('diagnosis-logs');
  const location = useLocation();
  console.log('locatioin', location.pathname);
  return (
    <>
      <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200 uppercase">
          Settings
        </span>
      </div>
      {/* <Tabs
        tabs={settingsTabs}
        value={tab}
        size="md"
        className="mt-2"
        onValueChange={(value) => {
          console.log('==ss==', value);
          setTab(value);
          navigate(`/settings/${value}`);
        }}
      >
        <div className="h-full mt-2">Diagnosos</div>
      </Tabs> */}
      <Outlet />
    </>
  );
};

export const module = {
  element: <Settings />,
};
