import { LoaderFunction, Outlet, redirect } from 'react-router-dom';

import { OnboardAppHeader } from '@/features/onboard/components/OnBoardAppHeader';
import { requireLogin } from '@/utils/api';

export const rootOnboardLoader: LoaderFunction = async ({ request }) => {
  await requireLogin();
  const url = new URL(request.url);
  if (['/onboard', '/onboard/'].includes(url.pathname)) {
    return redirect('/onboard/connectors', 302);
  }
  return null;
};

export const OnboardLayout = () => {
  return (
    <div className="bg-white dark:bg-gray-900 h-screen overflow-auto">
      <div className="px-16 pt-[64px] pb-8">
        <Outlet />
      </div>
      <OnboardAppHeader showGotoDashboard={true} />
    </div>
  );
};
