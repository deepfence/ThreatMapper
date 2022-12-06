import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { AuthLayout } from '../features/auth/layouts/AuthLayout';

const Login = lazy(() =>
  import('../features/auth/pages/Login').then((module) => ({
    default: module.Login,
  })),
);

const ForgotPassword = lazy(() =>
  import('../features/auth/pages/ForgotPassword').then((module) => ({
    default: module.ForgotPassword,
  })),
);

export const publicRoutes: RouteObject[] = [
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
    ],
  },
];
