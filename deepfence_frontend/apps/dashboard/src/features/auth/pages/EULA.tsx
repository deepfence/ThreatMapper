import { useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';
import { Card } from 'ui-components';

import { getCommonApiClient } from '@/api/api';
import AuthBg from '@/assets/auth-bg.svg';
import AuthBgLight from '@/assets/auth-bg-light.svg';
import { useTheme } from '@/theme/ThemeContext';
import { apiWrapper } from '@/utils/api';

type LoaderData = {
  message: string;
};

const loader = async (): Promise<LoaderData> => {
  const getEula = apiWrapper({
    fn: getCommonApiClient().getEula,
    options: {
      handleAuthError: false,
    },
  });

  const eulaResponse = await getEula();
  if (!eulaResponse.ok) {
    throw eulaResponse.error;
  }

  return {
    message: eulaResponse.value.message,
  };
};

const EULA = () => {
  const loaderData = useLoaderData() as LoaderData;
  const { mode } = useTheme();
  const bg = useMemo(() => {
    if (mode === 'light') {
      return AuthBgLight;
    }
    return AuthBg;
  }, [mode]);

  return (
    <div
      className="grid h-screen place-items-center overflow-auto bg-bg-card text-text-text-and-icon"
      style={{
        background: `url("${bg}") no-repeat center center`,
        backgroundSize: 'cover',
        backgroundColor: '#150C58',
      }}
    >
      <div className="relative">
        <div className="h-full grid place-items-center">
          <Card className="w-full max-w-[900px] p-8 my-8">
            <div
              style={{
                whiteSpace: 'pre-wrap',
              }}
            >
              {loaderData.message}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const module = {
  loader,
  element: <EULA />,
};
