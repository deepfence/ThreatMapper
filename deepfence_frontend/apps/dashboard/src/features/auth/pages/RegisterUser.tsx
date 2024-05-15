import { useState } from 'react';
import { Link, useFetcher } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Button, Checkbox, TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegisterActionReturnType } from '@/features/auth/actions/registerAction';

export const RegisterUser = () => {
  const fetcher = useFetcher<RegisterActionReturnType>();
  const [eulaAccepted, setEulaAccepted] = useState(false);

  const { data, state } = fetcher;

  return (
    <fetcher.Form method="post">
      <h1 className="text-text-text-and-icon text-h2 text-center">
        Register for Deepfence
      </h1>
      <TextInput
        className="mt-6"
        label="First Name"
        type={'text'}
        placeholder="First Name"
        name="firstName"
        color={data?.fieldErrors?.firstName ? 'error' : 'default'}
        helperText={data?.fieldErrors?.firstName}
      />
      <TextInput
        label="Last Name"
        type={'text'}
        placeholder="Last Name"
        name="lastName"
        className="mt-6"
        color={data?.fieldErrors?.lastName ? 'error' : 'default'}
        helperText={data?.fieldErrors?.lastName}
      />
      <TextInput
        label="Email"
        type={'text'}
        placeholder="Email"
        name="email"
        className="mt-6"
        color={data?.fieldErrors?.email ? 'error' : 'default'}
        helperText={data?.fieldErrors?.email}
      />
      <TextInput
        label="Password"
        type={'password'}
        placeholder="Password"
        name="password"
        className="mt-6"
        color={data?.fieldErrors?.password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.password}
      />
      <TextInput
        label="Confirm Password"
        type={'password'}
        placeholder="Confirm Password"
        name="confirmPassword"
        className="mt-6"
        color={data?.fieldErrors?.confirmPassword ? 'error' : 'default'}
        helperText={data?.fieldErrors?.confirmPassword}
      />
      <TextInput
        label="Company"
        type={'text'}
        placeholder="Company"
        name="company"
        className="mt-6"
        color={data?.fieldErrors?.company ? 'error' : 'default'}
        helperText={data?.fieldErrors?.company}
      />
      <div className={`mt-6 text-p7`}>
        <Checkbox
          checked={eulaAccepted}
          onCheckedChange={(checked) => {
            if (typeof checked === 'boolean') {
              setEulaAccepted(checked);
            }
          }}
          label={
            <div className="text-p7">
              I agree to terms and conditions outlined in{' '}
              <Link
                to="/end-user-license-agreement"
                className="text-text-link"
                target="_blank"
              >
                License Agreement
              </Link>
            </div>
          }
        />
      </div>

      {data?.error && (
        <div className={`text-center mt-1.5 text-status-error text-p7`}>{data.error}</div>
      )}

      <div
        className={cn('flex flex-col w-full mt-4', {
          'mt-4 ': data?.error?.length,
        })}
      >
        <Button
          size="md"
          className="w-full"
          type="submit"
          disabled={state !== 'idle' || !eulaAccepted}
          loading={state !== 'idle'}
        >
          Register
        </Button>
      </div>

      <div
        className={`flex flex-row justify-center text-p4 mt-4 text-text-text-and-icon`}
      >
        Already have an account?&nbsp;
        <DFLink to="/auth/login" className="underline text-accent-accent" unstyled>
          Sign in
        </DFLink>
      </div>
    </fetcher.Form>
  );
};
