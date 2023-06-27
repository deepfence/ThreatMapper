import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import { Card } from 'ui-components';

import { ModelSummary } from '@/api/generated/models/ModelSummary';
import { DFLink } from '@/components/DFLink';
import { RegistryLogos } from '@/components/icons/registries';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { queries } from '@/queries';
import { RegistryType, registryTypeToNameMapping } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';

interface RegistryResponseType extends ModelSummary {
  type: string;
}

const RegistrySkeleton = () => {
  return (
    <>
      {Array.from(Array(9).keys()).map((k) => (
        <Card
          className="p-2 animate-pulse pb-3 flex flex-col dark:bg-bg-card min-w-[322px]"
          key={k}
        >
          <div className="flex items-center w-full relative">
            <div className="dark:bg-bg-grid-default absolute -top-[34px] left-[12px] rounded-full">
              <div className="w-[72px] h-[72px]"></div>
            </div>
            <div className="ml-[102px]">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="flex mt-8 gap-x-[48px] justify-center items-center w-[322px]">
            <div className="flex flex-col justify-center text-p4 text-gray-900 dark:text-text-text-and-icon gap-y-4">
              <div className="h-2 w-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="flex flex-col justify-center text-p4 text-gray-900 dark:text-text-text-and-icon gap-y-4">
              <div className="h-2 w-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="flex flex-col justify-center text-p4 text-gray-900 dark:text-text-text-and-icon gap-y-4">
              <div className="h-2 w-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

const CardHeader = ({ registry }: { registry: RegistryResponseType }) => {
  const name = registryTypeToNameMapping[registry.type];

  return (
    <div className="flex items-center w-full relative">
      <div className="dark:bg-bg-grid-default absolute -top-[34px] left-[12px] rounded-full p-4">
        <RegistryLogos
          registryType={registry.type as unknown as keyof typeof RegistryType}
        />
      </div>
      <DFLink className="ml-[102px]" to={`/registries/${registry.type}`} unstyled>
        <span className="flex items-center gap-2 text-t4 uppercase dark:text-text-input-value dark:hover:text-text-link pt-1">
          {name}
        </span>
      </DFLink>
    </div>
  );
};

const Registry = ({ registry }: { registry: RegistryResponseType }) => {
  return (
    <Card className="p-2 pb-3 flex flex-col dark:bg-bg-card" key={registry.type}>
      <CardHeader registry={registry} />
      <div className="flex mt-6 gap-x-[48px] justify-center items-center w-[322px]">
        <div className="flex flex-col justify-center text-p4 text-gray-900 dark:text-text-text-and-icon">
          Registries
          <span className="text-h1 text-gray-900 dark:text-text-input-value">
            {abbreviateNumber(registry.registries ?? 0)}
          </span>
        </div>
        <div className="flex flex-col justify-center text-p4 text-gray-900 dark:text-text-text-and-icon">
          Images
          <span className="text-h1 text-gray-900 dark:text-text-input-value">
            {abbreviateNumber(registry.images ?? 0)}
          </span>
        </div>
        <div className="flex flex-col justify-center text-p4 text-gray-900 dark:text-text-text-and-icon">
          Tags
          <span className="text-h1 text-gray-900 dark:text-text-input-value">
            {abbreviateNumber(registry.tags ?? 0)}
          </span>
        </div>
      </div>
    </Card>
  );
};

const RegistryList = () => {
  const { data } = useSuspenseQuery({
    ...queries.registry.registrySummary(),
    keepPreviousData: true,
  });
  return (
    <>
      {data?.map((registry) => {
        return <Registry key={registry.type} registry={registry} />;
      })}
    </>
  );
};

const Registries = () => {
  return (
    <>
      <div className="flex py-2 w-full bg-white dark:bg-bg-breadcrumb-bar">
        <span className="dark:text-text-input-value pl-6 flex items-center text-sm leading-[30px]">
          <span className="w-4 h-4 mr-1.5">
            <RegistryIcon />
          </span>
          Registries
        </span>
      </div>
      <div className="mx-4 mt-[66px] flex gap-x-[20px] gap-y-[42px] flex-wrap">
        <Suspense fallback={<RegistrySkeleton />}>
          <RegistryList />
        </Suspense>
      </div>
    </>
  );
};

export const module = {
  element: <Registries />,
};
