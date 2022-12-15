import { RouteObject } from 'react-router-dom';

import { loginAction } from '../features/auth/actions/loginAction';
import { registeruserAction } from '../features/auth/actions/registerUserAction';
import { AuthLayout } from '../features/auth/layouts/AuthLayout';
import { ForgotPassword } from '../features/auth/pages/ForgotPassword';
import { Login } from '../features/auth/pages/Login';
import { RegisterUser } from '../features/auth/pages/RegisterUser';

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
        action: registeruserAction,
      },
    ],
  },
];
