import { Await, AwaitProps, Navigate, useAsyncError } from 'react-router-dom';

function DFAwaitErrorElement({ children }: { children: React.ReactNode }): JSX.Element {
  const error = useAsyncError();
  if (
    error instanceof Response &&
    error.status === 302 &&
    error.headers.get('location')?.startsWith('/')
  ) {
    return <Navigate to={error.headers.get('location') ?? '/auth/login'} />;
  }
  if (children) {
    return <>{children}</>;
  }
  throw error;
}
/**
 * Response thrown by deferred values are not handled by react-router.
 * So during the api call there is a 401 in which case we try to refresh
 * the access token. And if that too throws 401 then we throw internal
 * 302 to login. but in case of defer this won't work because 302 that was
 * thrown internally won't be caught by react-router. so we add logic to
 * do that here.
 *
 * TODO: in future mybe ban Await imports from react-router-dom with an eslint rule
 */
export function DFAwait({ children, errorElement, resolve }: AwaitProps): JSX.Element {
  return (
    <Await
      resolve={resolve}
      errorElement={<DFAwaitErrorElement>{errorElement}</DFAwaitErrorElement>}
    >
      {children}
    </Await>
  );
}
