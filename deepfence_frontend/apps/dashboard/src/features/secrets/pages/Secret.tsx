import { Breadcrumb, BreadcrumbLink } from 'ui-components';

import { SeverityLegend } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import {
  MostExploitableSecretsCountsCard,
  UniqueSecretsCountsCard,
} from '@/features/secrets/components/landing/SecretsCountsCard';
import { TopNSecretCard } from '@/features/secrets/components/landing/TopNSecretCard';
import { TopAttackPaths } from '@/features/vulnerabilities/components/landing/TopAttackPaths';

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
          <TopAttackPaths />
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
