import { Outlet, redirect } from 'react-router-dom';

import { OnboardAppHeader } from '../components/OnBoardAppHeader';

export const rootOnboardLoader = async ({ request }: any) => {
  const index = request.url.lastIndexOf('/onboard');
  const subpath = request.url.substring(index);
  if (subpath === '/onboard' || subpath === '/onboard/') {
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
