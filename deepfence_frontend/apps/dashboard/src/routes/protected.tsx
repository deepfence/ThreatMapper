import { lazy } from 'react';
import { Outlet, redirect } from 'react-router-dom';

import { AuthLayout } from '../components/auth/AuthLayout';
import { RootRouteError } from '../components/error/RootRouteError';
import { homeAction, homeLoader } from '../features/home/Home';
import storage from '../utils/storage';

const Home = lazy(() =>
  import('../features/home').then((module) => ({
    default: module.Home,
  })),
);

const PrivateApp = () => {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
};

const Else = (props: { type: string }) => {
  return <div>Else {props.type}</div>;
};

const rootLoader = async () => {
  const auth = storage.getAuth();
  if (!auth.isLogin) {
    return redirect('/login', {});
  }
};

export const protectedRoutes = [
  {
    path: '/',
    element: <PrivateApp />,
    errorElement: <RootRouteError />,
    loader: rootLoader,
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
      {
        path: 'else/else-inner',
        element: <Else type="else inner" />,
      },
    ],
  },
];
