import cx from 'classnames';
import { Link, useFetcher } from 'react-router-dom';
import { Button, TextInput, Typography } from 'ui-components';

import LogoDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { RegisterActionReturnType } from '@/features/auth/actions/registerAction';

export const RegisterUser = () => {
  const fetcher = useFetcher<RegisterActionReturnType>();

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
        Register for Deepfence
      </h1>
      <TextInput
        label="First Name"
        type={'text'}
        placeholder="First Name"
        sizing="sm"
        name="firstName"
        color={data?.fieldErrors?.firstName ? 'error' : 'default'}
      />
      {data?.fieldErrors?.firstName && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.firstName}
        </p>
      )}
      <TextInput
        label="Last Name"
        type={'text'}
        placeholder="Last Name"
        sizing="sm"
        name="lastName"
        className="mt-4"
        color={data?.fieldErrors?.lastName ? 'error' : 'default'}
      />
      {data?.fieldErrors?.lastName && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.lastName}
        </p>
      )}
      <TextInput
        label="Email"
        type={'text'}
        placeholder="Email"
        sizing="sm"
        name="email"
        className="mt-4"
        color={data?.fieldErrors?.email ? 'error' : 'default'}
      />
      {data?.fieldErrors?.email && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.email}
        </p>
      )}
      <TextInput
        label="Password"
        type={'password'}
        placeholder="Password"
        sizing="sm"
        name="password"
        className="mt-4"
        color={data?.fieldErrors?.password ? 'error' : 'default'}
      />
      {data?.fieldErrors?.password && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.password}
        </p>
      )}
      <TextInput
        label="Confirm Password"
        type={'password'}
        placeholder="Confirm Password"
        sizing="sm"
        name="confirmPassword"
        className="mt-4"
        color={data?.fieldErrors?.confirmPassword ? 'error' : 'default'}
      />
      {data?.fieldErrors?.confirmPassword && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.confirmPassword}
        </p>
      )}
      <TextInput
        label="Company"
        type={'text'}
        placeholder="Company"
        sizing="sm"
        name="company"
        className="mt-4"
        color={data?.fieldErrors?.company ? 'error' : 'default'}
      />
      {data?.fieldErrors?.company && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.company}
        </p>
      )}
      <div className="flex flex-col w-full mt-6">
        <Button
          size="md"
          color="primary"
          className="w-full"
          type="submit"
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
        >
          Register
        </Button>
      </div>

      {data?.error && (
        <div className={`text-center mt-1.5 text-red-500 ${Typography.size.sm}`}>
          {data.error}
        </div>
      )}
      <div className={`py-4 flex flex-col text-center ${Typography.size.xs} leading-6`}>
        By Signing up you agree to our
        <Link
          to="/end-user-license-agreement"
          className="text-blue-600 dark:text-blue-500"
        >
          License Agreement
        </Link>
      </div>
      <div className={`flex flex-row justify-center ${Typography.size.xs} leading-6`}>
        Already have an account?
        <Link to="/auth/login" className="text-blue-600 dark:text-blue-500">
          &nbsp;Login
        </Link>
      </div>
    </fetcher.Form>
  );
};
