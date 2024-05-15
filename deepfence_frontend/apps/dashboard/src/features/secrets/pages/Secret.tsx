import { Breadcrumb, BreadcrumbLink, Button, Card } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SeverityLegend } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { ThreatGraphIcon } from '@/components/sideNavigation/icons/ThreatGraph';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { CardHeader } from '@/features/secrets/components/landing/CardHeader';
import {
  MostExploitableSecretsCountsCard,
  UniqueSecretsCountsCard,
} from '@/features/secrets/components/landing/SecretsCountsCard';
import { TopNSecretCard } from '@/features/secrets/components/landing/TopNSecretCard';
import { THEME_LIGHT, useTheme } from '@/theme/ThemeContext';

const Secret = () => {
  const { mode } = useTheme();
  return (
    <div>
      <BreadcrumbWrapper>
        <Breadcrumb>
          <BreadcrumbLink
            icon={<SecretsIcon />}
            className="text-text-input-value leading-[30px]"
          >
            Secrets
          </BreadcrumbLink>
        </Breadcrumb>
      </BreadcrumbWrapper>
      <div className="mx-4 h-12 flex items-center">
        <div className="-ml-2.5">
          <DFLink unstyled to="/secret/scans" className="ml-auto">
            <Button
              variant="flat"
              size="sm"
              endIcon={
                <div className="-rotate-90">
                  <CaretDown />
                </div>
              }
            >
              View all scans
            </Button>
          </DFLink>
        </div>
        <div className="flex gap-2 items-center ml-auto">
          <span className="text-p6 text-text-text-and-icon self-center">Legends</span>
          <div className="flex gap-5">
            <SeverityLegend severity="critical" />
            <SeverityLegend severity="high" />
            <SeverityLegend severity="medium" />
            <SeverityLegend severity="low" />
            <SeverityLegend severity="unknown" />
          </div>
        </div>
      </div>
      <div className="mx-4 pb-4 grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <UniqueSecretsCountsCard />
        </div>

        <div className="col-span-3">
          <MostExploitableSecretsCountsCard />
        </div>
        <div className="col-span-6">
          <Card className="rounded min-h-[380px] flex flex-col">
            <CardHeader
              icon={<ThreatGraphIcon />}
              title={'Top Attack Paths'}
              path={'/threatgraph'}
            />
            <div
              className="flex-1 flex gap-2 items-center justify-center p-6 text-text-text-and-icon"
              style={{
                mixBlendMode: mode === THEME_LIGHT ? 'multiply' : 'normal',
                background:
                  mode === 'dark'
                    ? 'linear-gradient(0deg, rgba(22, 37, 59, 0.6), rgba(22, 37, 59, 0.6)), radial-gradient(48.55% 48.55% at 50.04% 51.45%, rgba(27, 47, 77, 0.35) 0%, #020617 100%)'
                    : 'radial-gradient(96.81% 77.58% at 50.04% 50%, rgba(247, 247, 247, 0.50) 8.84%, rgba(180, 193, 219, 0.50) 94.89%)',
              }}
            >
              <div className="h-6 w-6 shrink-0">
                <ErrorStandardLineIcon />
              </div>
              <div className="text-h3">No attack paths found.</div>
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
