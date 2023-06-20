import { useSuspenseQuery } from '@suspensive/react-query';
import { isNumber } from 'lodash-es';
import { Suspense } from 'react';
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

const isNonCloudProvider = (provider: string) => {
  return provider === 'linux' || provider === 'kubernetes';
};
const CardSkeleton = () => {
  return (
    <>
      {Array.from(Array(5).keys()).map((k) => (
        <Card
          className="p-2 animate-pulse items-center gap-2 min-w-[330px] min-h-[150px]"
          key={k}
        >
          <div className="flex items-center justify-between w-full">
            <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded-md ml-auto mt-2"></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex self-start flex-col border-r border-gray-200 dark:border-gray-700 w-20 h-20">
              <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10"></div>
              <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 mt-2"></div>
              <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 mt-2"></div>
            </div>
            <div className="flex gap-x-4 justify-center items-center">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

const CardHeader = ({ name }: { name: string }) => {
  return (
    <div className="flex items-center w-full relative">
      <div className="dark:bg-bg-grid-default absolute -top-[34px] left-[12px] rounded-full p-4">
        <PostureLogos name={name} />
      </div>
      <DFLink className="ml-[102px]" to={`/posture/accounts/${name}`} unstyled>
        <span className="flex items-center gap-2 text-t4 uppercase dark:text-text-input-value dark:hover:text-text-link pt-1">
          {providersToNameMapping[name]}
        </span>
      </DFLink>
    </div>
  );
};
const CardSectionIcon = ({ percent }: { percent: number | null | undefined }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="font-normal text-xs leading-6 dark:text-text-text-and-icon">
        Compliance
      </span>
      <div
        style={{
          color: getColorForCompliancePercent(percent),
        }}
        className="my-1.5"
      >
        <ComplianceIconByPercent percent={percent} />
      </div>
      <span
        className="text-h2"
        style={{
          color: getColorForCompliancePercent(percent),
        }}
      >
        {isNumber(percent)
          ? `${formatPercentage(percent, {
              maximumFractionDigits: 1,
            })}`
          : 'Not scanned'}
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
      <div className="mt-5 mb-2 grid grid-cols-3 place-items-center w-[322px]">
        <CardSectionIcon percent={provider.compliance_percentage} />
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
          <Separator className="dark:bg-bg-grid-border" />
          <PosturenNonCloudList />
        </Suspense>
      </div>
    </>
  );
};

export const module = {
  element: <Posture />,
};
