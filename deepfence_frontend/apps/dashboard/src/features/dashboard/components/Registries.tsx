import cx from 'classnames';
import { Suspense } from 'react';
import { HiOutlineChevronRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card, Separator } from 'ui-components';

import { LinkButton } from '@/components/LinkButton';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { getRegistryLogo } from '@/constants/logos';
import { DashboardLoaderData } from '@/features/dashboard/pages/Dashboard';
import { useTheme } from '@/theme/ThemeContext';
import { RegistryType } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';
import { DFAwait } from '@/utils/suspense';

const RegistriesSkeleton = () => {
  return (
    <div className={cx('flex flex-col gap-1 w-full')}>
      <div className="bg-gray-200 dark:bg-gray-600 h-6 animate-pulse w-2/3" />
      <div className="flex items-center gap-x-4">
        <div className="w-10 h-10 mr-2 bg-gray-200 dark:bg-gray-600 animate-pulse rounded-full" />
        <div className="flex flex-col">
          {[1].map((k) => (
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

export const Registries = () => {
  const { mode } = useTheme();
  const loaderData = useLoaderData() as DashboardLoaderData;
  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-2 pb-2">
        <div className="w-5 h-5 text-blue-700 dark:text-blue-300">
          <RegistryIcon />
        </div>
        <span className="text-base font-medium">Registries</span>
        <div className="flex ml-auto gap-1">
          <LinkButton to={'/registries'} sizing="xs">
            <>
              Go to Registries&nbsp;
              <HiOutlineChevronRight />
            </>
          </LinkButton>
        </div>
      </div>
      <Separator />
      <div className="p-4 grid grid-cols-3 gap-x-4 gap-y-6">
        <Suspense
          fallback={[1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => {
            return <RegistriesSkeleton key={idx} />;
          })}
        >
          <DFAwait resolve={loaderData.registries}>
            {(registries: DashboardLoaderData['registries']) => {
              return registries.map((registry) => {
                const { icon, name } = getRegistryLogo(
                  registry.type as unknown as keyof typeof RegistryType,
                  mode,
                );
                return (
                  <div className={cx('flex flex-col w-full py-3')} key={registry.type}>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {name}
                    </h4>
                    <div className="flex items-center gap-x-4">
                      <div className="p-2 flex w-14 h-14">
                        <img src={icon} alt="Registry logo" className="w-full" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                          {abbreviateNumber(registry.registries ?? 0)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Registries
                        </span>
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
