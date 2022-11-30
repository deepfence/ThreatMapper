import { Suspense } from 'react';
import { Await, useLoaderData, useNavigate } from 'react-router-dom';
import { Button } from 'ui-components';

import { useAuth } from '../../components/hooks/useAuth';
import { HomeDataType } from '.';

export const Home = () => {
  const { data } = useLoaderData() as HomeDataType;
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-around dark:text-white">
      <div>Home</div>
      <Suspense fallback={<p className="dark:text-white">Loading...</p>}>
        <Await resolve={data}>
          {(data) => (
            <>
              <Button
                onClick={() => {
                  logout();
                  navigate('/login', {
                    replace: true,
                  });
                }}
              >
                Logout
              </Button>
            </>
          )}
        </Await>
      </Suspense>
    </div>
  );
};
