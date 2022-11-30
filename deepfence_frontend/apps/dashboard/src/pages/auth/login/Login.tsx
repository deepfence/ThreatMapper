import cx from 'classnames';
import { useEffect } from 'react';
import { Link, useFetcher } from 'react-router-dom';
import { Button, Card, TextInput } from 'ui-components';

import { useAuth } from '../../../components/hooks/useAuth';

export const Login = () => {
  const fetcher = useFetcher();
  const auth = useAuth();

  const { data, state } = fetcher;

  useEffect(() => {
    if (data && data.success) {
      auth.login();
    }
  }, [data]);

  return (
    <div className="h-full flex items-center justify-center">
      <fetcher.Form method="post">
        <Card className="w-80 p-3 h-96">
          <TextInput
            label="Username"
            type={'text'}
            placeholder="Username"
            sizing="sm"
            name="email"
          />
          <TextInput
            label="Password"
            type={'password'}
            placeholder="Password"
            className="py-2"
            sizing="sm"
            name="password"
          />
          <div className="flex flex-col w-full py-5">
            <Button size="sm" color="primary" className="w-full">
              Login
            </Button>
            <Link
              to="/forgot-password"
              className={cx(
                'text-sm text-blue-600 mt-6 text-center',
                'hover:underline',
                'outline-none focus-visible:ring-1 focus-visible:ring-gray-900 dark:focus-visible:ring-2 dark:focus-visible:ring-gray-400',
              )}
            >
              Forgot password?
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
