import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { getSideNavigationState, SideNavigation } from '@/components/SideNavigation';

export const DashboardLayout = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(
    getSideNavigationState() === 'open' ? true : false,
  );
  return (
    <div className="bg-gray-50 dark:bg-gray-900 h-screen overflow-hidden">
      <AppHeader
        sideNavExpanded={sideNavExpanded}
        onSideNavExpandedChange={(state) => setSideNavExpanded(state)}
      />
      <div className="flex h-[calc(100%-64px)]">
        <SideNavigation expanded={sideNavExpanded} />
        <div className="overflow-auto h-full w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
