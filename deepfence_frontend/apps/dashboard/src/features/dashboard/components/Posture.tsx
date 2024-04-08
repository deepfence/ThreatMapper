import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useState } from 'react';
import { generatePath } from 'react-router-dom';
import { useMeasure } from 'react-use';
import { cn } from 'tailwind-preset';
import { Card, CircleSpinner } from 'ui-components';

import { ModelPostureProvider } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { ComplianceIconByPercent, PostureLogos } from '@/components/icons/posture';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { getColorForCompliancePercent } from '@/constants/charts';
import { CardHeader } from '@/features/dashboard/components/CardHeader';
import { providersToNameMapping } from '@/features/postures/pages/Posture';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { formatPercentage } from '@/utils/number';

function usePostureSummary() {
  return useSuspenseQuery({
    ...queries.posture.postureSummary(),
  });
}

export const Posture = () => {
  return (
    <Card className="flex flex-col h-full shadow-none">
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
  const { mode: theme } = useTheme();
  return (
    <DFLink
      unstyled
      to={generatePath(`/posture/accounts/${provider.name}`)}
      className={cn(
        'ring-inset dark:border-none border border-bg-grid-border rounded-[5px] overflow-hidden',
        'hover:ring-bg-hover-3 hover:ring-1 hover:shadow-[0px_0px_6px_2px_#044AFF]',
        'focus:ring-bg-hover-3 focus:shadow-[0px_0px_6px_1px_#044AFF] focus:ring-1',
      )}
    >
      <div className="dark:bg-bg-side-panel bg-white flex" key={provider.name}>
        <div className="flex items-center justify-center p-3">
          <div className="h-14 w-14 shrink-0 dark:bg-bg-breadcrumb-bar bg-df-gray-100 rounded-full flex items-center justify-center">
            <span className="w-9 h-9 block">
              <PostureLogos name={provider.name ?? ''} />
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="py-2 text-t5 uppercase dark:text-text-input-value text-text-text-and-icon truncate">
            {providersToNameMapping[provider.name ?? '']}
          </div>
          <div
            className="flex items-center gap-2"
            style={{
              color: getColorForCompliancePercent(
                theme,
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
