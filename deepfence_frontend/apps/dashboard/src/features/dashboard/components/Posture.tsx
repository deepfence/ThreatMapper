import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import { Card, CircleSpinner } from 'ui-components';

import { ModelPostureProvider } from '@/api/generated';
import { ComplianceIconByPercent, PostureLogos } from '@/components/icons/posture';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { getColorForCompliancePercent } from '@/constants/charts';
import { CardHeader } from '@/features/dashboard/components/CardHeader';
import { providersToNameMapping } from '@/features/postures/pages/Posture';
import { queries } from '@/queries';
import { formatPercentage } from '@/utils/number';

function usePostureSummary() {
  return useSuspenseQuery({
    ...queries.posture.postureSummary(),
  });
}

export const Posture = () => {
  return (
    <Card className="rounded-[5px] flex flex-col h-full">
      <CardHeader icon={<PostureIcon />} title="Posture" link="/posture" />
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <PostureCardContent />
        </Suspense>
      </div>
    </Card>
  );
};

const PostureCardContent = () => {
  const { data } = usePostureSummary();

  return (
    <div className="h-full w-full grid grid-cols-3 p-4 gap-4">
      {data.providers?.map((provider) => {
        return <PostureCardItem key={provider.name} provider={provider} />;
      })}
    </div>
  );
};

const PostureCardItem = ({ provider }: { provider: ModelPostureProvider }) => {
  const isScanned = provider.scan_count && provider.scan_count >= 0;
  return (
    <div className="dark:bg-bg-side-panel rounded-[5px] flex" key={provider.name}>
      <div className="flex items-center justify-center p-3">
        <div className="h-[60px] w-[60px] shrink-0 dark:bg-bg-breadcrumb-bar rounded-full flex items-center justify-center">
          <PostureLogos name={provider.name ?? ''} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="py-2 text-t5 uppercase dark:text-text-input-value">
          {providersToNameMapping[provider.name ?? '']}
        </div>
        <div
          className="flex items-center gap-2"
          style={{
            color: getColorForCompliancePercent(
              isScanned ? provider.compliance_percentage : null,
            ),
          }}
        >
          <div className="h-7 w-7 shrink-0">
            <ComplianceIconByPercent
              percent={isScanned ? provider.compliance_percentage : null}
            />
          </div>
          <div className="text-h1">
            {isScanned
              ? `${formatPercentage(provider.compliance_percentage ?? 0, {
                  maximumFractionDigits: 1,
                })}`
              : '-'}
          </div>
        </div>
      </div>
    </div>
  );
};
