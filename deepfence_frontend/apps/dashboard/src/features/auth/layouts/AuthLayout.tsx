import { Outlet } from 'react-router-dom';
import { Card } from 'ui-components';

import LoginBackground from '@/assets/background-login.svg';

export const AuthLayout = () => {
  return (
    <>
      <div className={`h-full w-full fixed`}>
        <img
          src={LoginBackground}
          alt="Login Background"
          className="w-full object-cover h-full"
        />
      </div>
      <div className="relative h-screen bg-[linear-gradient(0deg,_rgba(0_0,_0,_0.2),_rgba(0,_0,_0,_0.2)),_#FFFFFF]">
        <div className="h-full grid place-items-center">
          <Card className="w-[384px] p-8">
            <Outlet />
          </Card>
        </div>
      </div>
    </>
  );
};
