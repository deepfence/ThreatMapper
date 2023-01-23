import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';

export const DashboardLayout = () => {
  return (
    <div>
      <div className="mx-2 pt-[64px] pb-8 min-h-screen">
        <Outlet />
      </div>
      <AppHeader />
    </div>
  );
};
