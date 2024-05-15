import { Outlet } from 'react-router-dom';

import { UserInfoGuard } from '@/components/UserInfoGuard';
import { OnboardAppHeader } from '@/features/onboard/components/OnBoardAppHeader';

export const OnboardLayout = () => {
  return (
    <div className="bg-bg-page isolate h-screen overflow-auto">
      <div className="px-16 pt-[64px] pb-8">
        <Outlet />
      </div>
      <OnboardAppHeader />
      <UserInfoGuard />
    </div>
  );
};
