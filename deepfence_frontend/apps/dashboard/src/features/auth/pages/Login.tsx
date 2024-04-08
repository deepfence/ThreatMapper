import { useFetcher } from 'react-router-dom';
import { Button, TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { LoginActionReturnType } from '@/features/auth/actions/loginAction';

export const Login = () => {
  const fetcher = useFetcher<LoginActionReturnType>();
  const { data, state } = fetcher;

  return (
    <fetcher.Form method="post">
      <h1 className="text-p1a font-normal text-center text-text-text-and-icon">
        Welcome to
        <br />
        <span className="text-h2">Deepfence portal</span>
      </h1>
      <div className="mt-10">
        <TextInput
          className="autofill:bg-transparent"
          label="Email"
          type={'text'}
          placeholder="name@example.com"
          name="email"
          color={data?.fieldErrors?.email ? 'error' : 'default'}
          helperText={data?.fieldErrors?.email}
        />

        <TextInput
          className="mt-8"
          label="Password"
          type={'password'}
          placeholder="••••••••"
          name="password"
          color={data?.fieldErrors?.password ? 'error' : 'default'}
          helperText={data?.fieldErrors?.password}
        />

        <div className="flex flex-row w-full my-6">
          <DFLink
            unstyled
            to="/auth/forgot-password"
            className="ml-auto text-p5 underline text-accent-accent"
          >
            Forgot password?
          </DFLink>
        </div>
        {data?.error && (
          <div className={`text-center m-1.5 text-p7 text-status-error`}>
            {data.error}
          </div>
        )}
        <Button
          size="md"
          className="w-full"
          type="submit"
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
        >
          Sign In
        </Button>

        <p className="mt-4 text-p4 text-text-text-and-icon">
          Don&apos;t have account yet?{' '}
          <DFLink to="/auth/register" className="text-accent-accent underline" unstyled>
            Register now
          </DFLink>
        </p>
      </div>
    </fetcher.Form>
  );
};
