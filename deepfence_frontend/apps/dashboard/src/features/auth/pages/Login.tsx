import cx from 'classnames';
import { Link, useFetcher } from 'react-router-dom';
import { Button, Card, TextInput, Typography } from 'ui-components';

import { ModelResponse } from '../../../api/generated';
import LogoDarkBlue from '../../../assets/logo-deepfence-dark-blue.svg';

export const Login = () => {
  const fetcher = useFetcher<ModelResponse>();
  const { data } = fetcher;

  const hasFieldError = (field: string) => {
    if (data?.error_fields?.[field]) return true;
    return false;
  };

  return (
    <div className={cx('h-full grid place-items-center')}>
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
            label="Email"
            type={'text'}
            placeholder="name@example.com"
            sizing="sm"
            name="email"
          />
          {hasFieldError('email') && (
            <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
              {data?.error_fields?.email}
            </p>
          )}
          <TextInput
            className="mt-2.5"
            label="Password"
            type={'password'}
            placeholder="Password"
            sizing="sm"
            name="password"
          />
          {hasFieldError('password') && (
            <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
              {data?.error_fields?.password}
            </p>
          )}
          {data?.message && (
            <div className={`text-center mt-1.5 text-red-500 ${Typography.size.sm}`}>
              {data.message}
            </div>
          )}

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
        </Card>
      </fetcher.Form>
    </div>
  );
};
