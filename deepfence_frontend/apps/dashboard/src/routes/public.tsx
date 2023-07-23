import { FourZeroFourPublic } from '@/components/error/404';
import { FiveZeroZero } from '@/components/error/500';
import { loginAction } from '@/features/auth/actions/loginAction';
import { registerAction } from '@/features/auth/actions/registerAction';
import { AuthLayout } from '@/features/auth/layouts/AuthLayout';
import { loginLoader } from '@/features/auth/loaders/loginLoader';
import { registerLoader } from '@/features/auth/loaders/registerLoader';
import { module as eula } from '@/features/auth/pages/EULA';
import {
  ForgotPassword,
  forgotPasswordAction,
} from '@/features/auth/pages/ForgotPassword';
import { Login } from '@/features/auth/pages/Login';
import { RegisterUser } from '@/features/auth/pages/RegisterUser';
import { module as registerWithInvite } from '@/features/auth/pages/RegisterWithInvite';
import { module as resetPassword } from '@/features/auth/pages/ResetPassword';
import { CustomRouteObject } from '@/utils/router';

export const publicRoutes: CustomRouteObject[] = [
  {
    path: '/auth',
    errorElement: <FiveZeroZero />,
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
        action: forgotPasswordAction,
        meta: { title: 'Forgot Password?' },
      },
      {
        path: 'invite-accept',
        ...registerWithInvite,
        meta: { title: 'Register' },
      },
      {
        path: 'reset-password',
        ...resetPassword,
        meta: { title: 'Reset Password' },
      },
      {
        path: '*',
        element: <FourZeroFourPublic />,
      },
    ],
  },
  {
    path: 'end-user-license-agreement',
    ...eula,
    meta: { title: 'End User License Agreement' },
    errorElement: <FiveZeroZero />,
  },
];
