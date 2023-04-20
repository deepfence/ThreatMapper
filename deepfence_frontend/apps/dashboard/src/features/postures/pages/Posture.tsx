import cx from 'classnames';
import { Suspense } from 'react';
import { IconContext } from 'react-icons';
import { HiArrowSmRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card } from 'ui-components';

import { getCloudNodesApiClient } from '@/api/api';
import { ModelCloudNodeProvidersListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { getPostureLogo } from '@/constants/logos';
import { useTheme } from '@/theme/ThemeContext';
import { ApiError, makeRequest } from '@/utils/api';
import { abbreviateNumber, formatPercentage } from '@/utils/number';
import { typedDefer } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

export type LoaderDataType = {
  error?: string;
  message?: string;
  data: Awaited<ReturnType<typeof getCloudNodeProviders>>;
};

async function getCloudNodeProviders(): Promise<ModelCloudNodeProvidersListResp> {
  const result = await makeRequest({
    apiFunction: getCloudNodesApiClient().listCloudProviders,
    apiArgs: [],
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  if (!result.providers) {
    result.providers = [];
  }
  return result;
}
const loader = async () => {
  return typedDefer({
    data: getCloudNodeProviders(),
  });
};

const CardSkeleton = () => {
  return (
    <>
      {Array.from(Array(5).keys()).map((k) => (
        <Card
          className="p-4 animate-pulse items-center gap-2 min-w-[330px] min-h-[150px]"
          key={k}
        >
          <div className="flex items-center justify-between w-full">
            <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded-md ml-auto mt-2"></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex self-start flex-col border-r border-gray-200 dark:border-gray-700 w-20 h-20">
              <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10"></div>
              <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 mt-2"></div>
              <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 mt-2"></div>
            </div>
            <div className="flex gap-x-4 justify-center items-center">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

const AccountSummary = () => {
  const { mode } = useTheme();
  const loaderData = useLoaderData() as LoaderDataType;

  return (
    <>
      <Suspense fallback={<CardSkeleton />}>
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: LoaderDataType['data']) => {
            return resolvedData.providers?.map((provider) => {
              const {
                name = '',
                node_count,
                scan_count,
                compliance_percentage = 0,
                resource_count,
              } = provider;
              const account = getPostureLogo(name, mode);
              return (
                <Card key={name} className="p-4 flex flex-col gap-y-1">
                  <div className="flex items-center justify-between w-full">
                    <h4 className="text-gray-900 text-sm dark:text-white mr-4 uppercase">
                      {account.label}
                    </h4>
                    <div className="ml-auto">
                      <DFLink
                        to={`/posture/accounts/${name}`}
                        className="flex items-center hover:no-underline"
                      >
                        <span className="text-xs text-blue-600 dark:text-blue-500">
                          Go to details
                        </span>
                        <IconContext.Provider
                          value={{
                            className: 'text-blue-600 dark:text-blue-500',
                          }}
                        >
                          <HiArrowSmRight />
                        </IconContext.Provider>
                      </DFLink>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-x-6">
                    <div className="pr-2 flex flex-col gap-y-2 border-r border-gray-200 dark:border-gray-700">
                      <div className="px-4 flex basis-8 justify-center items-center w-20 h-20">
                        <img height="100%" width="100%" src={account.icon} alt="logo" />
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          className={cx('text-md rounded-lg px-1 font-medium w-fit', {
                            'bg-[#de425b]/30 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                              compliance_percentage > 60 && compliance_percentage < 100,
                            'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                              compliance_percentage > 30 && compliance_percentage < 90,
                            'bg-[#0E9F6E]/20 dark:bg-[#0E9F6E]/20 text-[#0E9F6E] dark:text-[#0E9F6E]':
                              compliance_percentage !== 0 && compliance_percentage < 30,
                            'text-gray-700 dark:text-gray-400': !compliance_percentage,
                          })}
                        >
                          {formatPercentage(compliance_percentage, {
                            maximumFractionDigits: 1,
                          })}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Compliance
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[1.875rem] text-gray-900 dark:text-gray-200 font-light">
                        {abbreviateNumber(node_count ?? 0)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {name === 'host'
                          ? `Host${node_count && node_count > 1 ? 's' : ''}`
                          : `Account${node_count && node_count > 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[1.875rem] text-gray-900 dark:text-gray-200 font-light">
                        {abbreviateNumber(resource_count ?? 0)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Resources
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[1.875rem] text-gray-900 dark:text-gray-200 font-light">
                        {abbreviateNumber(scan_count ?? 0)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Scans
                      </span>
                    </div>
                  </div>
                </Card>
              );
            });
          }}
        </DFAwait>
      </Suspense>
    </>
  );
};

const Posture = () => {
  return (
    <>
      <div className="flex p-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200">
          Posture
        </span>
      </div>
      <div className="p-2 flex flex-row flex-wrap gap-4">
        <AccountSummary />
      </div>
    </>
  );
};

export const module = {
  loader,
  element: <Posture />,
};
