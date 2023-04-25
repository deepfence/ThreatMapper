import cx from 'classnames';
import { Suspense } from 'react';
import { HiOutlineChevronRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card, Separator } from 'ui-components';

import { LinkButton } from '@/components/LinkButton';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { getPostureLogo } from '@/constants/logos';
import { DashboardLoaderData } from '@/features/dashboard/pages/Dashboard';
import { useTheme } from '@/theme/ThemeContext';
import { abbreviateNumber, formatPercentage } from '@/utils/number';
import { DFAwait } from '@/utils/suspense';

export const PostureStatSkeleton = () => {
  return (
    <div className={cx('flex flex-col py-4 gap-1 dark:border-gray-700')}>
      <div className="bg-gray-200 dark:bg-gray-600 h-6 animate-pulse w-2/3" />
      <div className="flex items-center gap-x-4">
        <div className="w-10 h-10 mr-2 bg-gray-200 dark:bg-gray-600 animate-pulse rounded-full" />
        <div className="flex gap-x-6">
          {[1, 2].map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <span className="h-7 bg-gray-200 dark:bg-gray-600 animate-pulse w-8" />
              <span className="h-4 bg-gray-200 dark:bg-gray-600 animate-pulse w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Posture = () => {
  const loaderData = useLoaderData() as DashboardLoaderData;
  const { mode } = useTheme();
  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-2 pb-2">
        <div className="w-5 h-5 text-blue-700 dark:text-blue-300">
          <PostureIcon />
        </div>
        <h4 className="text-base font-medium">Posture</h4>
        <div className="flex ml-auto">
          <LinkButton to={'/posture'} sizing="xs">
            <>
              Go to Posture Dashboard&nbsp;
              <HiOutlineChevronRight />
            </>
          </LinkButton>
        </div>
      </div>
      <Separator />
      <div className="px-4 grid grid-cols-2 gap-4">
        <Suspense
          fallback={[1, 2, 3, 4, 5, 6].map((idx) => {
            return <PostureStatSkeleton key={idx} />;
          })}
        >
          <DFAwait resolve={loaderData.cloudProviders}>
            {(data: DashboardLoaderData['cloudProviders']) => {
              return data.providers?.map((provider) => {
                const { icon, label } = getPostureLogo(provider.name ?? '', mode);
                return (
                  <div
                    key={provider.name}
                    className={cx('flex flex-col py-4 gap-1 dark:border-gray-700')}
                  >
                    <h4 className="text-gray-500 dark:text-gray-400 text-sm font-normal">
                      {label}
                    </h4>
                    <div className="flex items-center gap-x-4">
                      <div className="flex items-center basis-10 shrink-0 mr-2">
                        <img src={icon} alt="logo" />
                      </div>
                      <div className="flex gap-x-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-2xl text-gray-900 dark:text-gray-200 font-light">
                            {abbreviateNumber(provider.node_count ?? 0)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Accounts
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-2xl text-gray-900 dark:text-gray-200 font-light">
                            {formatPercentage(provider.compliance_percentage ?? 0, {
                              maximumFractionDigits: 1,
                            })}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Compliance
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            }}
          </DFAwait>
        </Suspense>
      </div>
    </Card>
  );
};
