import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div>
      this is the auth layout with some background.
      <Outlet />
    </div>
  );
};
