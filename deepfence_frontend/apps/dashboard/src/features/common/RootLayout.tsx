import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { getSideNavigationState, SideNavigation } from '@/components/SideNavigation';

export const RootLayout = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(
    getSideNavigationState() === 'open' ? true : false,
  );
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <main className="flex pt-[64px]">
        <SideNavigation expanded={sideNavExpanded} />
        <div className="overflow-auto h-[calc(100vh_-_64px)] w-full">
          <Outlet />
        </div>
      </main>
      <AppHeader
        sideNavExpanded={sideNavExpanded}
        onSideNavExpandedChange={(state) => setSideNavExpanded(state)}
      />
    </div>
  );
};
