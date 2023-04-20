import { loginAction } from '@/features/auth/actions/loginAction';
import { registerAction } from '@/features/auth/actions/registerAction';
import { AuthLayout } from '@/features/auth/layouts/AuthLayout';
import { loginLoader } from '@/features/auth/loaders/loginLoader';
import { registerLoader } from '@/features/auth/loaders/registerLoader';
import { ForgotPassword } from '@/features/auth/pages/ForgotPassword';
import { Login } from '@/features/auth/pages/Login';
import { RegisterUser } from '@/features/auth/pages/RegisterUser';
import { module as registerWithInvite } from '@/features/auth/pages/RegisterWithInvite';
import { CustomRouteObject } from '@/utils/router';

export const publicRoutes: CustomRouteObject[] = [
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
        action: loginAction,
        loader: loginLoader,
        meta: { title: 'Log in' },
      },
      {
        path: 'register',
        element: <RegisterUser />,
        action: registerAction,
        loader: registerLoader,
        meta: { title: 'Register' },
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
        meta: { title: 'Forgot Password?' },
      },
      {
        path: 'invite-accept',
        ...registerWithInvite,
        meta: { title: 'Register' },
      },
    ],
  },
];
