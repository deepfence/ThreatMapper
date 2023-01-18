import { LoaderFunction, Outlet, redirect } from 'react-router-dom';

import { OnboardAppHeader } from '../components/OnBoardAppHeader';

export const rootOnboardLoader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  if (['/onboard', '/onboard/'].includes(url.pathname)) {
    return redirect('/onboard/connectors', 302);
  }
  return null;
};

export const OnboardLayout = () => {
  return (
    <div>
      <div className="mx-16 pt-[64px] pb-8 min-h-screen">
        <Outlet />
      </div>
      <OnboardAppHeader />
    </div>
  );
};
