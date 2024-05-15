import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from 'tailwind-preset';

import { AppHeader } from '@/components/AppHeader';
import { getSideNavigationState, SideNavigation } from '@/components/SideNavigation';
import { UserInfoGuard } from '@/components/UserInfoGuard';

export const RootLayout = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(
    getSideNavigationState() === 'open' ? true : false,
  );
  return (
    <>
      <div className="min-h-screen bg-bg-page isolate">
        <AppHeader />
        <SideNavigation
          expanded={sideNavExpanded}
          onExpandedChange={(state) => setSideNavExpanded(state)}
        />
        <main
          className={cn('pt-[56px] h-screen overflow-auto transition-[margin-left]', {
            'ml-[61px]': !sideNavExpanded,
            'ml-[240px]': sideNavExpanded,
          })}
        >
          <Outlet />
        </main>
      </div>
      <UserInfoGuard />
    </>
  );
};
