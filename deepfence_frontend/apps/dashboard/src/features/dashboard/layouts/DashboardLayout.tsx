import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { SideNavigation } from '@/components/SideNavigation';

export const DashboardLayout = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(true);
  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <AppHeader
        sideNavExpanded={sideNavExpanded}
        onSideNavExpandedChange={(state) => setSideNavExpanded(state)}
      />
      <div className="flex">
        <SideNavigation expanded={sideNavExpanded} />
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
