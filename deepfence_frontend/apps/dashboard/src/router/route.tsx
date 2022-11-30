import { createBrowserRouter } from 'react-router-dom';
import { Error } from 'ui-components';

import { forgotPasswordAction } from '../pages/auth/forget-password';
import { ForgetPassword } from '../pages/auth/forget-password/ForgetPassword';
import { loginAction } from '../pages/auth/login';
import { Login } from '../pages/auth/login/Login';
import { Home, homeAction, homeLoader } from '../pages/home';
import { RootRouteError } from './Error';
import { PrivateRoutes } from './PrivateRoute';

const Else = (props: { type: string }) => {
  return <div>Else {props.type}</div>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PrivateRoutes />,
    errorElement: <RootRouteError />,
    children: [
      {
        path: 'home',
        element: <Home />,
        loader: homeLoader,
        action: homeAction,
      },
      {
        path: 'else',
        element: <Else type="1" />,
      },
    ],
  },
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
  {
    path: '*',
    element: <Error errorType="notFound" />,
  },
]);
