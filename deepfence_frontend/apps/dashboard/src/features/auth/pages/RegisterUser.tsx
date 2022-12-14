import cx from 'classnames';
import { Link, redirect, useFetcher } from 'react-router-dom';
import { Button, Card, TextInput, Typography } from 'ui-components';

import LogoDarkBlue from '../../../assets/logo-deepfence-dark-blue.svg';
import storage from '../../../utils/storage';

export const registerAction = async ({
  request,
}: {
  request: Request;
  params: Record<string, unknown>;
}) => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  storage.setAuth({ isLogin: true });
  return redirect('/home', {});
};

export const RegisterUser = () => {
  const fetcher = useFetcher();

  const { data, state } = fetcher;

  return (
    <div className="h-screen flex items-center justify-center overflow-y-auto">
      <fetcher.Form method="post">
        <div className="pt-24">
          <Card className="w-[384px] mb-4 p-8 ">
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
              className="mb-2.5"
            />
            <TextInput
              label="Last Name"
              type={'text'}
              placeholder="Last Name"
              sizing="sm"
              name="lastName"
              className="mb-2.5"
            />
            <TextInput
              label="Password"
              type={'password'}
              placeholder="Password"
              sizing="sm"
              name="password"
              className="mb-2.5"
            />
            <TextInput
              label="Confirm Password"
              type={'password'}
              placeholder="Confirm Password"
              sizing="sm"
              name="confirmPassword"
              className="mb-2.5"
            />
            <TextInput
              label="Company"
              type={'text'}
              placeholder="Company"
              sizing="sm"
              name="company"
              className="mb-2.5"
            />
            <div className="flex flex-col w-full mt-6">
              <Button size="md" color="primary" className="w-full">
                Register
              </Button>
            </div>
            <div
              className={`py-4 flex flex-col text-center ${Typography.size.xs} leading-6`}
            >
              By Signing up you agree to our
              <Link to="/" className="text-blue-600 dark:text-blue-400">
                License Agreement
              </Link>
            </div>
            <div
              className={`flex flex-row justify-center ${Typography.size.xs} leading-6`}
            >
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
        </div>
      </fetcher.Form>
    </div>
  );
};
