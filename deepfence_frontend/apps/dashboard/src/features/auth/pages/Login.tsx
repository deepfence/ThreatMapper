import cx from 'classnames';
import { Link, redirect, useFetcher } from 'react-router-dom';
import { Button, Card, TextInput, Typography } from 'ui-components';

import LogoDarkBlue from '../../../assets/logo-deepfence-dark-blue.svg';
import storage from '../../../utils/storage';

export const loginAction = async ({
  request,
}: {
  request: Request;
  params: Record<string, unknown>;
}) => {
  storage.setAuth({ isLogin: true });
  return redirect('/onboard', 302);
};

export const Login = () => {
  const fetcher = useFetcher();
  const { data, state } = fetcher;

  return (
    <div className={cx('h-screen flex items-center justify-center')}>
      <fetcher.Form method="post">
        <Card className="w-[384px] p-8">
          <div className="text-center">
            <img
              src={LogoDarkBlue}
              alt="Deefence Logo"
              width="55.46"
              height="34.74"
              className="m-auto"
            />
          </div>
          <h1
            className={cx(
              `${Typography.size['2xl']} ${Typography.weight.medium}`,
              'text-center leading-6 mb-6 mt-2',
            )}
          >
            Log In to Deepfence
          </h1>
          <TextInput
            className="mb-2.5"
            label="Email"
            type={'text'}
            placeholder="name@example.com"
            sizing="sm"
            name="email"
          />
          <TextInput
            label="Password"
            type={'password'}
            placeholder="Password"
            sizing="sm"
            name="password"
          />
          <div className="flex flex-row w-full my-6">
            <Link
              to="/auth/forgot-password"
              className={cx(
                `${Typography.size.xs} `,
                'mr-auto bg-transparent text-blue-600 dark:text-blue-400',
              )}
            >
              Forgot password?
            </Link>
            <Link
              to="/auth/register"
              className={cx(
                `${Typography.size.xs} `,
                'bg-transparent text-blue-600 dark:text-blue-400',
              )}
            >
              Register
            </Link>
          </div>
          <Button size="md" color="primary" className="w-full mb-4">
            Log In
          </Button>
          <Link
            to="/register"
            className={cx(
              `${Typography.size.xs} `,
              'bg-transparent justify-center text-blue-600 dark:text-blue-400 flex',
            )}
          >
            Single Sign-On (SSO)
          </Link>
          <div>
            {data?.error
              ? data.error.message
              : state === 'submitting'
              ? 'Loading...'
              : null}
          </div>
        </Card>
      </fetcher.Form>
    </div>
  );
};
