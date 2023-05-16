import classNames from 'classnames';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { getSideNavigationState, SideNavigation } from '@/components/SideNavigation';

export const RootLayout = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(
    getSideNavigationState() === 'open' ? true : false,
  );
  return (
    <div className="bg-white min-h-screen dark:bg-gray-900 isolate">
      <AppHeader
        sideNavExpanded={sideNavExpanded}
        onSideNavExpandedChange={(state) => setSideNavExpanded(state)}
      />
      <SideNavigation expanded={sideNavExpanded} />
      <main
        className={classNames(
          'pt-[64px] h-screen overflow-auto transition-[margin-left]',
          {
            'ml-[60px]': !sideNavExpanded,
            'ml-[240px]': sideNavExpanded,
          },
        )}
      >
        <Outlet />
      </main>
    </div>
  );
};
