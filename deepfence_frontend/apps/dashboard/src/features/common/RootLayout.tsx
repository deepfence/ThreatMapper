import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from 'tailwind-preset';

import { AppHeader } from '@/components/AppHeader';
import { getSideNavigationState, SideNavigation } from '@/components/SideNavigation';
import { NudgeContext, useNudgeState } from '@/features/common/components/NudgeContext';
import { Nudges } from '@/features/common/components/Nudges';

export const RootLayout = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(
    getSideNavigationState() === 'open' ? true : false,
  );
  const { nudgeValue, setNudgeValue } = useNudgeState();

  return (
    <NudgeContext.Provider value={{ nudgeValue, setNudgeValue }}>
      <div className="bg-white min-h-screen dark:bg-bg-page isolate">
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
        <Nudges />
      </div>
    </NudgeContext.Provider>
  );
};
