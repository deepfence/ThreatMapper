import { Outlet } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink } from 'ui-components';

import { SettingsIcon } from '@/components/sideNavigation/icons/Settings';
import { SettingNavigation } from '@/features/settings/components/SettingNavigation';

const Settings = () => {
  return (
    <>
      <div className="dark:bg-bg-breadcrumb-bar py-2 px-4">
        <Breadcrumb>
          <BreadcrumbLink icon={<SettingsIcon />} className="dark:text-text-input-value">
            Settings
          </BreadcrumbLink>
        </Breadcrumb>
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
