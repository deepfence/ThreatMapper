import { Outlet } from 'react-router-dom';

import LoginBackground from '../../../assets/background-login.svg';

export const AuthLayout = () => {
  return (
    <>
      <div className={`h-full w-full absolute`}>
        <img
          src={LoginBackground}
          alt="Login Background"
          className="w-full object-cover h-full"
        />
      </div>
      <div className="relative h-full bg-[linear-gradient(0deg,_rgba(0_0,_0,_0.2),_rgba(0,_0,_0,_0.2)),_#FFFFFF]">
        <Outlet />
      </div>
    </>
  );
};
