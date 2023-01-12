import { RouteObject } from 'react-router-dom';

import { loginAction } from '../features/auth/actions/loginAction';
import { registerAction } from '../features/auth/actions/registerAction';
import { AuthLayout } from '../features/auth/layouts/AuthLayout';
import { loginLoader } from '../features/auth/loaders/loginLoader';
import { registerLoader } from '../features/auth/loaders/registerLoader';
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
        loader: loginLoader,
      },
      {
        path: 'register',
        element: <RegisterUser />,
        action: registerAction,
        loader: registerLoader,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
    ],
  },
];
