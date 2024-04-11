import { Outlet } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink } from 'ui-components';

import { SettingsIcon } from '@/components/sideNavigation/icons/Settings';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { SettingNavigation } from '@/features/settings/components/SettingNavigation';

const Settings = () => {
  return (
    <>
      <BreadcrumbWrapper>
        <Breadcrumb>
          <BreadcrumbLink
            icon={<SettingsIcon />}
            className="text-text-input-value leading-[30px]"
          >
            Settings
          </BreadcrumbLink>
        </Breadcrumb>
      </BreadcrumbWrapper>
      <div className="flex">
        <div>
          <SettingNavigation />
        </div>
        <div className="px-4 flex-1">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export const module = {
  element: <Settings />,
};
