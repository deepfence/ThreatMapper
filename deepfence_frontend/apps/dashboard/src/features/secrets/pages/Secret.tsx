import { Breadcrumb, BreadcrumbLink, Card } from 'ui-components';

import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SeverityLegend } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { ThreatGraphIcon } from '@/components/sideNavigation/icons/ThreatGraph';
import { CardHeader } from '@/features/secrets/components/landing/CardHeader';
import {
  MostExploitableSecretsCountsCard,
  UniqueSecretsCountsCard,
} from '@/features/secrets/components/landing/SecretsCountsCard';
import { TopNSecretCard } from '@/features/secrets/components/landing/TopNSecretCard';

const Secret = () => {
  return (
    <div>
      <div className="dark:bg-bg-breadcrumb-bar py-2 px-6">
        <Breadcrumb>
          <BreadcrumbLink icon={<SecretsIcon />} className="dark:text-text-input-value">
            Secrets
          </BreadcrumbLink>
        </Breadcrumb>
      </div>
      <div className="py-3 pl-6 pr-4 flex gap-2">
        <span className="text-p6 dark:text-text-text-and-icon self-center">Legends</span>
        <div className="flex gap-5">
          <SeverityLegend severity="critical" />
          <SeverityLegend severity="high" />
          <SeverityLegend severity="medium" />
          <SeverityLegend severity="low" />
          <SeverityLegend severity="unknown" />
        </div>
      </div>
      <div className="px-4 pb-4 pt-1 grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <UniqueSecretsCountsCard />
        </div>

        <div className="col-span-3">
          <MostExploitableSecretsCountsCard />
        </div>
        <div className="col-span-6">
          <Card className="rounded min-h-[450px] flex flex-col">
            <CardHeader
              icon={<ThreatGraphIcon />}
              title={'Top Attack Paths'}
              path={'/threatgraph'}
            />
            <div className="flex-1 flex gap-2 items-center justify-center p-6 dark:text-text-text-and-icon">
              <div className="h-6 w-6 shrink-0">
                <ErrorStandardLineIcon />
              </div>
              <div className="text-h3">Coming soon.</div>
            </div>
          </Card>
        </div>
        <div className="col-span-4">
          <TopNSecretCard type="container" />
        </div>
        <div className="col-span-4">
          <TopNSecretCard type="host" />
        </div>
        <div className="col-span-4">
          <TopNSecretCard type="image" />
        </div>
      </div>
    </div>
  );
};

export const module = {
  element: <Secret />,
};
