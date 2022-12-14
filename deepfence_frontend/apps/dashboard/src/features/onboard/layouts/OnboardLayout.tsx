import { Outlet } from 'react-router-dom';

import { OnboardAppHeader } from '../components/OnBoardAppHeader';

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
