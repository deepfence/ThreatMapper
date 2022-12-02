import { lazy } from 'react';
import { Error } from 'ui-components';

import { forgotPasswordAction } from '../features/auth/forget-password/ForgetPassword';
import { loginAction } from '../features/auth/login/Login';

const Login = lazy(() =>
  import('../features/auth/login/Login').then((module) => ({
    default: module.Login,
  })),
);

const ForgetPassword = lazy(() =>
  import('../features/auth/forget-password/ForgetPassword').then((module) => ({
    default: module.ForgetPassword,
  })),
);

export const unprotectedRoutes = [
  {
    path: '/login',
    element: <Login />,
    errorElement: <Error errorType="server" />,
    action: loginAction,
  },
  {
    path: '/forgot-password',
    element: <ForgetPassword />,
    action: forgotPasswordAction,
  },
];
