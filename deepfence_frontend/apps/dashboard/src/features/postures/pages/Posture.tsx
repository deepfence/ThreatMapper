import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import { cn } from 'tailwind-preset';
import { Breadcrumb, BreadcrumbLink, Card, Separator } from 'ui-components';

import { ModelPostureProvider } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { ComplianceIconByPercent, PostureLogos } from '@/components/icons/posture';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { getColorForCompliancePercent } from '@/constants/charts';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { abbreviateNumber, formatPercentage } from '@/utils/number';

export const providersToNameMapping: { [key: string]: string } = {
  aws: 'AWS',
  aws_org: 'AWS Organizations',
  gcp: 'GCP',
  gcp_org: 'GCP Organizations',
  azure: 'Azure',
  linux: 'Linux Hosts',
  kubernetes: 'Kubernetes',
};

export const isNonCloudProvider = (provider: string) => {
  return provider === 'linux' || provider === 'kubernetes';
};
export const isLinuxProvider = (provider: string) => provider === 'linux';
export const isKubernetesProvider = (provider: string) => provider === 'kubernetes';

const HeaderSkeleton = () => {
  return (
    <div className="flex items-center w-full relative">
      <div className="bg-bg-grid-border absolute -top-[34px] left-[8px] rounded-full">
        <div className="w-[64px] h-[64px]"></div>
      </div>
      <div className="ml-[100px]">
        <div className="h-4 w-20 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      </div>
    </div>
  );
};
const IconSkeleton = () => {
  return (
    <div className="min-w-[84px] flex flex-col items-center justify-center">
      <div className="h-2 w-4 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="my-1.5">
        <div className="h-6 w-6 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      </div>
      <div className="h-4 w-4 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
    </div>
  );
};
const TextSkeleton = () => {
  return (
    <div className="min-w-[112px] gap-y-4 flex flex-col">
      <div className="h-2 w-32 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="h-2 w-28 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="h-2 w-24 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="h-2 w-28 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
    </div>
  );
};
const CountSkeleton = () => {
  return (
    <div className="min-w-[34px] flex flex-col gap-y-2">
      <div className="h-5 w-5 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="h-5 w-5 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="h-5 w-5 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="h-5 w-5 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
    </div>
  );
};
const CardSkeleton = ({ count }: { count: number }) => {
  return (
    <>
      {Array.from(Array(count).keys()).map((k) => (
        <Card
          className="p-2 animate-pulse items-center gap-2 bg-bg-card min-w-[322px]"
          key={k}
        >
          <HeaderSkeleton />
          <div className="flex mt-5 gap-x-6">
            <IconSkeleton />
            <TextSkeleton />
            <CountSkeleton />
          </div>
        </Card>
      ))}
    </>
  );
};

const CardHeader = ({ name }: { name: string }) => {
  return (
    <div className="flex items-center w-full relative">
      <div className="dark:bg-bg-grid-default bg-df-gray-100 border-[1px] dark:border-bg-grid-default border-df-gray-300 absolute -top-[34px] left-[12px] rounded-full p-3 dark:shadow-none shadow-[0_0_4px_0px_rgba(34,34,34,0.20)]">
        <span className="w-[38px] h-[38px] block">
          <PostureLogos name={name} />
        </span>
      </div>

      <span className="ml-[122px] flex items-center gap-2 text-t4 uppercase text-text-input-value pt-1">
        {providersToNameMapping[name]}
      </span>
    </div>
  );
};
const CardIconSection = ({ provider }: { provider: ModelPostureProvider }) => {
  const isScanned = provider.scan_count && provider.scan_count >= 0;
  const { mode: theme } = useTheme();
  return (
    <div
      className={cn('flex flex-col self-start w-fit ml-[15px]', {
        'items-center': isScanned,
      })}
    >
      <span className="text-p7 leading-6 text-text-text-and-icon">Compliance</span>
      <div
        style={{
          color: getColorForCompliancePercent(theme, provider.compliance_percentage),
        }}
        className={cn('my-1.5', {
          'h-6 w-6 shrink-0': isScanned,
        })}
      >
        {isScanned ? (
          <ComplianceIconByPercent percent={provider.compliance_percentage ?? 0} />
        ) : null}
      </div>
      <span
        className="text-h2"
        style={{
          color: getColorForCompliancePercent(theme, provider.compliance_percentage),
        }}
      >
        {isScanned ? (
          `${formatPercentage(provider.compliance_percentage ?? 0, {
            maximumFractionDigits: 1,
          })}`
        ) : (
          <span className="text-p7 leading-6 text-text-input-value">Not scanned</span>
        )}
      </span>
    </div>
  );
};

const CardCountSection = ({ provider }: { provider: ModelPostureProvider }) => {
  const textStyle = 'text-p7a leading-6 text-text-text-and-icon min-w-[120px]';
  const countStyle = 'text-h3 text-text-input-value';
  return (
    <div className="ml-[42px]">
      <div className="flex gap-x-6">
        <span className={textStyle}>
          {!isNonCloudProvider(provider.name ?? '') ? (
            'Active Accounts'
          ) : (
            <>
              {isLinuxProvider(provider.name ?? '') && 'Active hosts'}
              {isKubernetesProvider(provider.name ?? '') && 'Active clusters'}
            </>
          )}
        </span>
        <span className={countStyle}>{abbreviateNumber(provider.node_count ?? 0)}</span>
      </div>

      <div className="flex gap-x-6">
        <span className={textStyle}>
          {!isNonCloudProvider(provider.name ?? '') ? (
            'Inactive Accounts'
          ) : (
            <>
              {isLinuxProvider(provider.name ?? '') && 'Inactive hosts'}
              {isKubernetesProvider(provider.name ?? '') && 'Inactive clusters'}
            </>
          )}
        </span>
        <span className={countStyle}>
          {abbreviateNumber(provider.node_count_inactive ?? 0)}
        </span>
      </div>

      <div className="flex gap-x-6">
        <span className={textStyle}>
          {!isNonCloudProvider(provider.name ?? '') ? (
            'Scanned Accounts'
          ) : (
            <>
              {isLinuxProvider(provider.name ?? '') && 'Scanned hosts'}
              {isKubernetesProvider(provider.name ?? '') && 'Scanned clusters'}
            </>
          )}
        </span>
        <span className={countStyle}>{abbreviateNumber(provider.scan_count ?? 0)}</span>
      </div>

      {!isNonCloudProvider(provider.name ?? '') ? (
        <div className="flex gap-x-6">
          <span className={textStyle}>Resources</span>
          <span className={countStyle}>
            {abbreviateNumber(provider.resource_count ?? 0)}
          </span>
        </div>
      ) : null}
    </div>
  );
};
const PostureCard = ({ provider }: { provider: ModelPostureProvider }) => {
  return (
    <Card
      className={cn(
        'relative group pt-2 pb-4 flex flex-col bg-bg-card',
        'hover:outline dark:outline-2 outline-1 dark:hover:outline-bg-hover-3 hover:outline-text-link hover:shadow-[0px_0px_6px_2px_#044AFF] dark:hover:shadow-none',
        "before:content-none hover:before:content-[''] before:w-[68px] before:h-[68px]",
        'dark:before:bg-bg-hover-3 before:bg-text-link dark:shadow-none before:shadow-[0px_0px_7px_-1px_#044AFF] before:absolute before:-top-[28px]',
        'before:left-[10px] before:rounded-full before:-z-10 cursor-pointer',
      )}
    >
      <DFLink to={`/posture/accounts/${provider.name}`} unstyled>
        <CardHeader name={provider.name || ''} />
        <div className="mt-4 flex w-[322px]">
          <CardIconSection provider={provider} />
          <CardCountSection provider={provider} />
        </div>
      </DFLink>
    </Card>
  );
};

const PostureCloudList = () => {
  const { data } = useSuspenseQuery({
    ...queries.posture.postureSummary(),
  });
  const providers = data.providers;
  if (!providers) {
    return null;
  }
  return (
    <>
      {providers
        ?.filter((provider) => !isNonCloudProvider(provider.name ?? ''))
        .map((provider) => {
          return <PostureCard key={provider.name} provider={provider} />;
        })}
    </>
  );
};

const PosturenNonCloudList = () => {
  const { data } = useSuspenseQuery({
    ...queries.posture.postureSummary(),
  });
  const providers = data.providers;
  if (!providers) {
    return null;
  }
  return (
    <>
      {providers
        ?.filter((provider) => isNonCloudProvider(provider.name ?? ''))
        .map((provider) => {
          return <PostureCard key={provider.name} provider={provider} />;
        })}
    </>
  );
};

const Posture = () => {
  return (
    <>
      <BreadcrumbWrapper>
        <Breadcrumb>
          <BreadcrumbLink
            icon={<PostureIcon />}
            className="text-text-input-value leading-[30px]"
          >
            Posture
          </BreadcrumbLink>
        </Breadcrumb>
      </BreadcrumbWrapper>
      <div className="mx-4 my-10 flex gap-x-4 flex-wrap gap-y-10">
        <Suspense
          fallback={
            <div className="flex flex-col gap-y-10">
              <div className="flex gap-x-4">
                <CardSkeleton count={3} />
              </div>
              <Separator className="bg-bg-grid-border h-px w-full" />
              <div className="mt-8 flex gap-x-4">
                <CardSkeleton count={2} />
              </div>
            </div>
          }
        >
          <PostureCloudList />
          <Separator className="bg-bg-grid-border h-px w-full" />
          <div className="mt-6 flex gap-x-4">
            <PosturenNonCloudList />
          </div>
        </Suspense>
      </div>
    </>
  );
};

export const module = {
  element: <Posture />,
};
