import { RouteObject } from 'react-router-dom';

import { AuthLayout } from '../features/auth/layouts/AuthLayout';
import { ForgotPassword } from '../features/auth/pages/ForgotPassword';
import { Login, loginAction } from '../features/auth/pages/Login';
import { registerAction, RegisterUser } from '../features/auth/pages/RegisterUser';

export const publicRoutes: RouteObject[] = [
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
        action: loginAction,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: 'register',
        element: <RegisterUser />,
        action: registerAction,
      },
    ],
  },
];
