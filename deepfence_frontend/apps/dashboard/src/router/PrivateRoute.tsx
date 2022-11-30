import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { AuthUserType } from '../components/hooks/useAuth';
import { useLocalStorage } from '../components/hooks/useLocalStorage';
import { AuthLayout } from '../pages/auth/AuthLayout';

export const PrivateRoutes = () => {
  const [user] = useLocalStorage<AuthUserType>('user');
  const location = useLocation();

  if (!user.isLogin) {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === '/') {
    return <Navigate to="/home" replace />;
  }
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
};
