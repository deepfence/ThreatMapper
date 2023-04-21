import { Outlet } from 'react-router-dom';
import { Card } from 'ui-components';

import LoginBackground from '@/assets/background-login.svg';

export const AuthLayout = () => {
  return (
    <div
      className="grid h-screen place-items-center overflow-auto bg-cover"
      style={{
        backgroundImage: `url("${LoginBackground}")`,
      }}
    >
      <div className="relative">
        <div className="h-full grid place-items-center">
          <Card className="w-[384px] p-8 my-8">
            <Outlet />
          </Card>
        </div>
      </div>
    </div>
  );
};
