import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import {
  getSideNavigationState,
  SideNavigation,
  SideNavProvider,
  useSideNavContext,
} from '@/components/SideNavigation';

export const DashboardLayout = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(
    getSideNavigationState() === 'open' ? true : false,
  );
  const value = useSideNavContext();
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <SideNavProvider value={value}>
        <main className="flex pt-[64px]">
          <SideNavigation expanded={sideNavExpanded} />
          <div className="overflow-auto h-full w-full">
            <Outlet />
          </div>
        </main>
      </SideNavProvider>
      <AppHeader
        sideNavExpanded={sideNavExpanded}
        onSideNavExpandedChange={(state) => setSideNavExpanded(state)}
      />
    </div>
  );
};
