import { Suspense } from 'react';
import { HiOutlineChevronRight } from 'react-icons/hi';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { Button, Card, Separator } from 'ui-components';

import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import {
  TopRisksCardContent,
  TopRisksCardContentsSkeleton,
} from '@/features/dashboard/components/top-risks/TopRisksCardContent';
import { DashboardLoaderData } from '@/features/dashboard/pages/Dashboard';
import { DFAwait } from '@/utils/suspense';

export const TopRisksSecret = () => {
  const loaderData = useLoaderData() as DashboardLoaderData;
  const navigate = useNavigate();
  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-x-2 pb-2">
        <div className="w-5 h-5 text-blue-700 dark:text-blue-300">
          <SecretsIcon />
        </div>
        <h4 className="text-base font-medium">Secrets</h4>
        <div className="flex justify-end ml-auto">
          <Button
            color="normal"
            size="xs"
            onClick={(e) => {
              e.preventDefault();
              navigate('/secret');
            }}
          >
            Go to Secrets Dashboard&nbsp;
            <HiOutlineChevronRight />
          </Button>
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
