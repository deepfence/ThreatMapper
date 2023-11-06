import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useState } from 'react';
import { generatePath } from 'react-router-dom';
import { useMeasure } from 'react-use';
import { Card, CircleSpinner } from 'ui-components';

import { ModelPostureProvider } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
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
  const [measureRef, { width }] = useMeasure<HTMLDivElement>();
  const [columns, setColumns] = useState(3);
  const { data } = usePostureSummary();

  useEffect(() => {
    if (!width) return;
    if (width >= 630) {
      setColumns(3);
    } else {
      setColumns(2);
    }
  }, [width]);

  return (
    <div
      className="w-full grid p-4 gap-4"
      ref={measureRef}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {data.providers?.map((provider) => {
        return <PostureCardItem key={provider.name} provider={provider} />;
      })}
    </div>
  );
};

const PostureCardItem = ({ provider }: { provider: ModelPostureProvider }) => {
  const isScanned = provider.scan_count && provider.scan_count >= 0;
  return (
    <DFLink
      unstyled
      to={generatePath(`/posture/accounts/${provider.name}`)}
      className="ring-inset dark:hover:ring-bg-hover-3 dark:hover:ring-1 dark:focus:ring-bg-hover-3 dark:hover:shadow-[0px_0px_6px_1px_#044AFF] dark:focus:shadow-[0px_0px_6px_1px_#044AFF] dark:focus:ring-1"
    >
      <div className="dark:bg-bg-side-panel rounded-[5px] flex" key={provider.name}>
        <div className="flex items-center justify-center p-3">
          <div className="h-14 w-14 shrink-0 dark:bg-bg-breadcrumb-bar rounded-full flex items-center justify-center">
            <span className="w-9 h-9 block">
              <PostureLogos name={provider.name ?? ''} />
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="py-2 text-t5 uppercase dark:text-text-input-value truncate">
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
            <div className="h-6 w-6 shrink-0">
              <ComplianceIconByPercent
                percent={isScanned ? provider.compliance_percentage : null}
              />
            </div>
            <div className="text-h2">
              {isScanned
                ? `${formatPercentage(provider.compliance_percentage ?? 0, {
                    maximumFractionDigits: 1,
                  })}`
                : '-'}
            </div>
          </div>
        </div>
      </div>
    </DFLink>
  );
};
