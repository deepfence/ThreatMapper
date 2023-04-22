import classNames from 'classnames';
import { useMemo, useState } from 'react';
import { useLocation, useRouteError } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { getSideNavigationState, SideNavigation } from '@/components/SideNavigation';
import { OnboardAppHeader } from '@/features/onboard/components/OnBoardAppHeader';
import storage from '@/utils/storage';

const PageNotFoundComponent = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-white from-80% via-white via-90% to-blue-100 to-30% dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-700 dark:to-blue-900">
      <h1 className="text-[10.875rem] text-blue-500 dark:text-blue-600 font-semibold -mt-20">
        404
      </h1>
      <h4 className="text-3xl font-bold text-gray-700 dark:text-gray-400 -mt-10">
        Not Found
      </h4>
      <p className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300 tracking-wider">
        Sorry, we were unable to find that page
      </p>
    </div>
  );
};
export const FourZeroFour = () => {
  const [sideNavExpanded, setSideNavExpanded] = useState(
    getSideNavigationState() === 'open' ? true : false,
  );
  const error = useRouteError();
  const isAuth = useMemo(() => storage.getAuth(), []);
  const location = useLocation();

  console.error(error);

  if (location.pathname.startsWith('/onboard')) {
    return (
      <div className="min-h-screen isolate">
        <div className="pt-[64px] h-screen">
          <PageNotFoundComponent />
        </div>
        <OnboardAppHeader showGotoDashboard={false} />
      </div>
    );
  }

  return (
    <div className="min-h-screen isolate">
      {isAuth ? (
        <div>
          <AppHeader
            sideNavExpanded={sideNavExpanded}
            onSideNavExpandedChange={(state) => setSideNavExpanded(state)}
          />
          <SideNavigation expanded={sideNavExpanded} />
          <main
            className={classNames(
              'pt-[64px] h-screen overflow-hidden transition-[margin-left]',
              {
                'ml-[60px]': !sideNavExpanded,
                'ml-[240px]': sideNavExpanded,
              },
            )}
          >
            <PageNotFoundComponent />
          </main>
        </div>
      ) : (
        <div className="h-screen">
          <PageNotFoundComponent />
        </div>
      )}
    </div>
  );
};
