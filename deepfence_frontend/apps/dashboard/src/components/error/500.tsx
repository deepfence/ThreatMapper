import classNames from 'classnames';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { getSideNavigationState, SideNavigation } from '@/components/SideNavigation';
import { OnboardAppHeader } from '@/features/onboard/components/OnBoardAppHeader';
import storage from '@/utils/storage';

const ErrorComponent = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-white from-80% via-white via-90% to-blue-100 to-30% dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-700 dark:to-blue-900">
      <h1 className="text-[10.875rem] text-red-500 dark:text-red-600 font-semibold -mt-20">
        500
      </h1>
      <h4 className="text-3xl font-bold text-gray-700 dark:text-gray-400 -mt-10">
        Something went wrong
      </h4>
      <p className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300 tracking-wider">
        Please try again or contact support
      </p>
    </div>
  );
};
export const FiveZeroZero = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(
    getSideNavigationState() === 'open' ? true : false,
  );
  const isAuth = useMemo(() => storage.getAuth(), []);
  const location = useLocation();

  if (location.pathname.startsWith('/onboard')) {
    return (
      <div className="min-h-screen isolate">
        <div className="pt-[64px] h-screen">
          <ErrorComponent />
        </div>
        <OnboardAppHeader showGotoDashboard={false} />
      </div>
    );
  }

  return (
    <div className="min-h-screen isolate">
      {isAuth ? (
        <>
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
            <ErrorComponent />
          </main>
        </>
      ) : (
        <div className="h-screen">
          <ErrorComponent />
        </div>
      )}
    </div>
  );
};
