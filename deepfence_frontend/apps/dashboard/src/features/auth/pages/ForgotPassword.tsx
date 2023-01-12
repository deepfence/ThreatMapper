import cx from 'classnames';
import { Link, useFetcher } from 'react-router-dom';
import { Button, Card, TextInput, Typography } from 'ui-components';

import LogoDarkBlue from '../../../assets/logo-deepfence-dark-blue.svg';

export const forgotPasswordAction = async ({
  request,
}: {
  request: Request;
  params: Record<string, unknown>;
}) => {
  return {
    success: true,
  };
};

export const ForgotPassword = () => {
  const fetcher = useFetcher();
  const { data, state } = fetcher;
  return (
    <div className="h-screen flex items-center justify-center">
      <fetcher.Form method="post">
        <Card className="w-[384px] p-8">
          <div className="text-center">
            <img
              src={LogoDarkBlue}
              alt="Deefence Logo"
              width="55.46'"
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
            Forgot Password
          </h1>
          <p className={`${Typography.size.sm} mb-2.5`}>
            Provide the email registered with your account.
          </p>
          <TextInput
            label="Email Address"
            type={'text'}
            placeholder="Email"
            sizing="sm"
            name="email"
            color={data?.errors?.newPassword ? 'error' : 'default'}
            helperText={data?.errors?.newPassword?.[0]}
          />

          <div className="flex flex-col w-full mt-6">
            <Button size="md" color="primary" className="w-full mb-4">
              Send Link
            </Button>
            <Link
              to="/auth/login"
              className={cx(
                `${Typography.size.xs} `,
                'bg-transparent text-center text-blue-600 dark:text-blue-400',
              )}
            >
              Back to Login
            </Link>
          </div>
          <div>{state === 'submitting' ? 'Loading...' : null}</div>
        </Card>
      </fetcher.Form>
    </div>
  );
};
