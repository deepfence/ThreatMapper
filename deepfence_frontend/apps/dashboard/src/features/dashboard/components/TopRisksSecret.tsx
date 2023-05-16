import { Suspense } from 'react';
import { HiOutlineChevronRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card, Separator } from 'ui-components';

import { LinkButton } from '@/components/LinkButton';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import {
  TopRisksCardContent,
  TopRisksCardContentsSkeleton,
} from '@/features/dashboard/components/top-risks/TopRisksCardContent';
import { DashboardLoaderData } from '@/features/dashboard/pages/Dashboard';
import { DFAwait } from '@/utils/suspense';

export const TopRisksSecret = () => {
  const loaderData = useLoaderData() as DashboardLoaderData;

  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-x-2 pb-2">
        <div className="w-5 h-5 text-blue-700 dark:text-blue-300">
          <SecretsIcon />
        </div>
        <h4 className="text-base font-medium">Secrets</h4>
        <div className="flex justify-end ml-auto">
          <LinkButton to={'/secret'} sizing="xs">
            <>
              Go to Secrets Dashboard&nbsp;
              <HiOutlineChevronRight />
            </>
          </LinkButton>
        </div>
      </div>
      <Separator />
      <Suspense fallback={<TopRisksCardContentsSkeleton />}>
        <DFAwait resolve={loaderData.secretsData}>
          {(data: DashboardLoaderData['secretsData']) => {
            return <TopRisksCardContent data={data} />;
          }}
        </DFAwait>
      </Suspense>
    </Card>
  );
};
