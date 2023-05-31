import cx from 'classnames';
import { Suspense } from 'react';
import { HiOutlineChevronRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card } from 'ui-components';

import { getCloudNodesApiClient } from '@/api/api';
import { ModelCloudNodeProvidersListResp } from '@/api/generated';
import { LinkButton } from '@/components/LinkButton';
import { getPostureLogo } from '@/constants/logos';
import { useTheme } from '@/theme/ThemeContext';
import { apiWrapper } from '@/utils/api';
import { abbreviateNumber, formatPercentage } from '@/utils/number';
import { typedDefer } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

export type LoaderDataType = {
  error?: string;
  message?: string;
  data: Awaited<ReturnType<typeof getCloudNodeProviders>>;
};

export const providersToNameMapping: { [key: string]: string } = {
  aws: 'AWS',
  aws_org: 'AWS Organizations',
  gcp: 'GCP',
  gcp_org: 'GCP Organizations',
  azure: 'Azure',
  linux: 'Linux Hosts',
  kubernetes: 'Kubernetes',
};

async function getCloudNodeProviders(): Promise<ModelCloudNodeProvidersListResp> {
  const listCloudProvidersApi = apiWrapper({
    fn: getCloudNodesApiClient().listCloudProviders,
  });
  const result = await listCloudProvidersApi();

  if (!result.ok) {
    throw result.error;
  }

  if (!result.value.providers) {
    result.value.providers = [];
  }
  return result.value;
}
const loader = async () => {
  return typedDefer({
    data: getCloudNodeProviders(),
  });
};

const isProviderLinuxOrKubernetes = (provider: string) => {
  return provider === 'linux' || provider === 'kubernetes';
};
const CardSkeleton = () => {
  return (
    <>
      {Array.from(Array(5).keys()).map((k) => (
        <Card
          className="p-2 animate-pulse items-center gap-2 min-w-[330px] min-h-[150px]"
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
                node_label,
              } = provider;
              const account = getPostureLogo(name, mode);

              return (
                <Card key={name} className="p-2 pb-3 flex flex-col">
                  <div className="flex items-center w-full">
                    <h4 className="text-gray-900 text-sm font-medium dark:text-white mr-4">
                      {providersToNameMapping[name]}
                    </h4>
                    <div className="flex ml-auto">
                      <LinkButton to={`/posture/accounts/${name}`} sizing="xs">
                        <>
                          Go to details&nbsp;
                          <HiOutlineChevronRight />
                        </>
                      </LinkButton>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-x-6 items-center">
                    <div className="pr-2 flex flex-col gap-y-2 border-r border-gray-200 dark:border-gray-700">
                      <div className="px-4 flex justify-center items-center h-8 w-20 max-h-9">
                        <img src={account.icon} alt="logo" />
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          className={cx('text-base rounded-lg px-1 font-medium w-fit', {
                            'bg-[#FF8A4C]/30 dark:bg-[#FF8A4C]/20 text-[#FF5A1F] dark:text-[#FF5A1F]':
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
                    <div className="flex flex-col min-w-[70px]">
                      <span className="text-[1.875rem] text-gray-900 dark:text-gray-200 font-light">
                        {abbreviateNumber(node_count ?? 0)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {node_label}
                      </span>
                    </div>
                    {!isProviderLinuxOrKubernetes(name) ? (
                      <div className="flex flex-col min-w-[70px]">
                        <span className="text-[1.875rem] text-gray-900 dark:text-gray-200 font-light">
                          {abbreviateNumber(resource_count ?? 0)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Resources
                        </span>
                      </div>
                    ) : null}

                    <div className="flex flex-col min-w-[70px]">
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
      <div className="p-2 flex flex-row flex-wrap gap-2">
        <AccountSummary />
      </div>
    </>
  );
};

export const module = {
  loader,
  element: <Posture />,
};
