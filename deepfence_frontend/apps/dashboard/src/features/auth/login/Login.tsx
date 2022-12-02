import cx from 'classnames';
import { Link, redirect, useFetcher } from 'react-router-dom';
import { Button, Card, TextInput } from 'ui-components';

import storage from '../../../utils/storage';

export const loginAction = async ({
  request,
}: {
  request: Request;
  params: Record<string, unknown>;
}) => {
  storage.setAuth({ isLogin: true });
  return redirect('/home', {});
};

export const Login = () => {
  const fetcher = useFetcher();

  const { data, state } = fetcher;

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
              className={cx('mt-6', 'hover:underline bg-transparent')}
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
