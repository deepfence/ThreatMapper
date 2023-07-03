import { Outlet } from 'react-router-dom';

import { SettingsIcon } from '@/components/sideNavigation/icons/Settings';
import { SettingNavigation } from '@/features/settings/components/SettingNavigation';

const Settings = () => {
  return (
    <>
      <div className="flex py-2 w-full bg-white dark:bg-bg-breadcrumb-bar">
        <span className="dark:text-text-input-value pl-6 flex items-center text-sm leading-[30px]">
          <span className="w-4 h-4 mr-1.5">
            <SettingsIcon />
          </span>
          Settings
        </span>
      </div>
      <div className="flex">
        <div>
          <SettingNavigation />
        </div>
        <div className="mx-4 flex-1">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export const module = {
  element: <Settings />,
};
