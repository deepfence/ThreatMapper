import cx from 'classnames';
import { Link, useFetcher } from 'react-router-dom';
import { Button, TextInput, Typography } from 'ui-components';

import LogoDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { LoginActionReturnType } from '@/features/auth/actions/loginAction';

export const Login = () => {
  const fetcher = useFetcher<LoginActionReturnType>();
  const { data, state } = fetcher;

  return (
    <fetcher.Form method="post">
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
        color={data?.fieldErrors?.email ? 'error' : 'default'}
      />
      {data?.fieldErrors?.email && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.email}
        </p>
      )}
      <TextInput
        className="mt-4"
        label="Password"
        type={'password'}
        placeholder="••••••••"
        sizing="sm"
        name="password"
        color={data?.fieldErrors?.password ? 'error' : 'default'}
      />
      {data?.fieldErrors?.password && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data.fieldErrors.password}
        </p>
      )}

      <div className="flex flex-row w-full my-6">
        <Link
          to="/auth/forgot-password"
          className={cx(
            `${Typography.size.xs} `,
            'mr-auto bg-transparent text-blue-600 dark:text-blue-500',
          )}
        >
          Forgot password?
        </Link>
        <Link
          to="/auth/register"
          className={cx(
            `${Typography.size.xs} `,
            'bg-transparent text-blue-600 dark:text-blue-500',
          )}
        >
          Register
        </Link>
      </div>
      <Button
        size="md"
        color="primary"
        className="w-full"
        type="submit"
        disabled={state !== 'idle'}
        loading={state !== 'idle'}
      >
        Log In
      </Button>
      {data?.error && (
        <div className={`text-center mt-1.5 text-red-500 ${Typography.size.sm}`}>
          {data.error}
        </div>
      )}
    </fetcher.Form>
  );
};
