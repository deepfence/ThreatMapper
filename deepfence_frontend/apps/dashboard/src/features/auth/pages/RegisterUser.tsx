import cx from 'classnames';
import { Link, useFetcher } from 'react-router-dom';
import { Button, Card, TextInput, Typography } from 'ui-components';

import LogoDarkBlue from '../../../assets/logo-deepfence-dark-blue.svg';

export const RegisterUser = () => {
  const fetcher = useFetcher();

  const { data, state } = fetcher;

  const isFieldError = (field: string) => {
    if (data?.error_fields?.[field]) return true;
    return false;
  };

  return (
    <div className="h-full grid place-items-center overflow-y-auto">
      <fetcher.Form method="post">
        <Card className="w-[384px] my-4 p-8">
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
            name="first_name"
          />
          {isFieldError('first_name') && (
            <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
              {data?.error_fields?.first_name}
            </p>
          )}
          <TextInput
            label="Last Name"
            type={'text'}
            placeholder="Last Name"
            sizing="sm"
            name="last_name"
            className="mt-2.5"
          />
          {isFieldError('last_name') && (
            <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
              {data?.error_fields?.last_name}
            </p>
          )}
          <TextInput
            label="Email"
            type={'text'}
            placeholder="Email"
            sizing="sm"
            name="email"
            className="mt-2.5"
          />
          {isFieldError('email') && (
            <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
              {data?.error_fields?.email}
            </p>
          )}
          <TextInput
            label="Password"
            type={'password'}
            placeholder="Password"
            sizing="sm"
            name="password"
            className="mt-2.5"
          />
          {isFieldError('password') && (
            <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
              {data?.error_fields?.password}
            </p>
          )}
          <TextInput
            label="Confirm Password"
            type={'password'}
            placeholder="Confirm Password"
            sizing="sm"
            name="confirmPassword"
            className="mt-2.5"
          />
          {isFieldError('confirmPassword') && (
            <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
              {data?.error_fields?.confirmPassword}
            </p>
          )}
          <TextInput
            label="Company"
            type={'text'}
            placeholder="Company"
            sizing="sm"
            name="company"
            className="mt-2.5"
          />
          <div className="flex flex-col w-full mt-6">
            <Button size="md" color="primary" className="w-full">
              Register
            </Button>
          </div>

          {data?.message && (
            <div className={`text-center mt-1.5 text-red-500 ${Typography.size.sm}`}>
              {data.message}
            </div>
          )}
          <div
            className={`py-4 flex flex-col text-center ${Typography.size.xs} leading-6`}
          >
            By Signing up you agree to our
            <Link to="/" className="text-blue-600 dark:text-blue-400">
              License Agreement
            </Link>
          </div>
          <div className={`flex flex-row justify-center ${Typography.size.xs} leading-6`}>
            Already have an account?
            <Link to="/auth/login" className="text-blue-600 dark:text-blue-400">
              &nbsp;Login
            </Link>
          </div>
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
