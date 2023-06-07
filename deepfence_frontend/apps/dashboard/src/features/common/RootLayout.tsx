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
    <div className="bg-white min-h-screen dark:bg-bg-page isolate">
      <AppHeader />
      <SideNavigation
        expanded={sideNavExpanded}
        onExpandedChange={(state) => setSideNavExpanded(state)}
      />
      <main
        className={classNames(
          'pt-[56px] h-screen overflow-auto transition-[margin-left]',
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
