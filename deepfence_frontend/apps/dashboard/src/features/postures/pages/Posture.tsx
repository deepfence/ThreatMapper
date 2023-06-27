import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import { cn } from 'tailwind-preset';
import { Card, Separator } from 'ui-components';

import { ModelPostureProvider } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { ComplianceIconByPercent, PostureLogos } from '@/components/icons/posture';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { getColorForCompliancePercent } from '@/constants/charts';
import { queries } from '@/queries';
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
const HeaderSkeleton = () => {
  return (
    <div className="flex items-center w-full relative">
      <div className="dark:bg-bg-grid-default absolute -top-[34px] left-[12px] rounded-full">
        <div className="w-[72px] h-[72px]"></div>
      </div>
      <div className="ml-[102px]">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );
};
const IconSkeleton = () => {
  return (
    <div className="min-w-[84px] flex flex-col items-center justify-center">
      <div className="h-2 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="my-1.5">
        <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
};
const TextSkeleton = () => {
  return (
    <div className="min-w-[112px] gap-y-4 flex flex-col">
      <div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-2 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-2 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-2 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
};
const CountSkeleton = () => {
  return (
    <div className="min-w-[34px] flex flex-col gap-y-2">
      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
};
const CardSkeleton = () => {
  return (
    <>
      {Array.from(Array(5).keys()).map((k) => (
        <Card
          className="p-2 animate-pulse items-center gap-2 dark:bg-bg-card min-w-[322px]"
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
      <div className="dark:bg-bg-grid-default absolute -top-[34px] left-[16px] rounded-full p-4">
        <PostureLogos name={name} />
      </div>
      <DFLink className="ml-[114px]" to={`/posture/accounts/${name}`} unstyled>
        <span className="flex items-center gap-2 text-t4 uppercase dark:text-text-input-value dark:hover:text-text-link pt-1">
          {providersToNameMapping[name]}
        </span>
      </DFLink>
    </div>
  );
};
const CardSectionIcon = ({ provider }: { provider: ModelPostureProvider }) => {
  const isScanned = provider.scan_count && provider.scan_count >= 0;

  return (
    <div
      className={cn('flex flex-col self-start', {
        'items-center': isScanned,
      })}
    >
      <span className="font-normal text-xs leading-6 dark:text-text-text-and-icon">
        Compliance
      </span>
      <div
        style={{
          color: getColorForCompliancePercent(12),
        }}
        className="my-1.5"
      >
        {isScanned ? (
          <ComplianceIconByPercent percent={provider.compliance_percentage ?? 0} />
        ) : null}
      </div>
      <span
        className="text-h2"
        style={{
          color: getColorForCompliancePercent(provider.compliance_percentage),
        }}
      >
        {isScanned ? (
          `${formatPercentage(provider.compliance_percentage ?? 0, {
            maximumFractionDigits: 1,
          })}`
        ) : (
          <span className="font-normal text-xs leading-6 dark:text-text-input-value">
            Not scanned
          </span>
        )}
      </span>
    </div>
  );
};
const CardSectionText = ({ name }: { name: string }) => {
  const textStyle = 'font-normal text-xs leading-6';
  return (
    <div className="flex flex-col dark:text-text-text-and-icon">
      <span className={textStyle}>Active accounts</span>
      <span className={textStyle}>Inactive accounts</span>
      <span className={textStyle}>Scans</span>
      {!isNonCloudProvider(name) ? <span className={textStyle}>Resources</span> : null}
    </div>
  );
};
const CardSectionCount = ({ provider }: { provider: ModelPostureProvider }) => {
  const textStyle = 'text-h3 dark:text-text-input-value';
  return (
    <div className="flex flex-col">
      <span className={textStyle}>{abbreviateNumber(provider.node_count ?? 0)}</span>
      <span className={textStyle}>{abbreviateNumber(provider.node_count ?? 0)}</span>
      <span className={textStyle}>{abbreviateNumber(provider.resource_count ?? 0)}</span>
      {!isNonCloudProvider(provider.name ?? '') ? (
        <span className={textStyle}>{abbreviateNumber(provider.scan_count ?? 0)}</span>
      ) : null}
    </div>
  );
};
const PostureCard = ({ provider }: { provider: ModelPostureProvider }) => {
  return (
    <Card className="p-2 pb-3 flex flex-col dark:bg-bg-card">
      <CardHeader name={provider.name || ''} />
      <div className="mt-6 mb-2 grid grid-cols-3 place-items-center min-w-[322px]">
        <CardSectionIcon provider={provider} />
        <CardSectionText name={provider.name ?? ''} />
        <CardSectionCount provider={provider} />
      </div>
    </Card>
  );
};

const PostureCloudList = () => {
  const { data } = useSuspenseQuery({
    ...queries.posture.postureSummary(),
    keepPreviousData: true,
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
    keepPreviousData: true,
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
      <div className="flex py-2 w-full bg-white dark:bg-bg-breadcrumb-bar">
        <span className="dark:text-text-input-value pl-6 flex items-center text-sm leading-[30px]">
          <span className="w-4 h-4 mr-1.5">
            <PostureIcon />
          </span>
          Posture
        </span>
      </div>
      <div className="mx-4 mt-10 mb-10 flex gap-x-[20px] gap-y-[42px] flex-wrap">
        <Suspense fallback={<CardSkeleton />}>
          <PostureCloudList />
          <Separator className="dark:bg-bg-grid-border h-px w-full" />
          <PosturenNonCloudList />
        </Suspense>
      </div>
    </>
  );
};

export const module = {
  element: <Posture />,
};
