import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import { cn } from 'tailwind-preset';
import { Breadcrumb, BreadcrumbLink, Card } from 'ui-components';

import { ModelSummary } from '@/api/generated/models/ModelSummary';
import { DFLink } from '@/components/DFLink';
import { RegistryLogos } from '@/components/icons/registries';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
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
          className="py-3 px-4 animate-pulse flex flex-col bg-bg-card min-w-[322px]"
          key={k}
        >
          <div className="flex items-center w-full relative">
            <div className="bg-bg-grid-border absolute -top-[45px] left-[6px] rounded-full">
              <div className="w-[74px] h-[74px]"></div>
            </div>
            <div className="ml-[102px]">
              <div className="h-4 w-20 bg-bg-grid-border rounded"></div>
            </div>
          </div>
          <div className="flex mt-6 gap-x-[48px] justify-center items-center w-[322px]">
            <div className="flex flex-col justify-center text-p4 text-text-text-and-icon gap-y-4">
              <div className="h-6 w-4 bg-bg-grid-border rounded"></div>
              <div className="h-2 w-14 bg-bg-grid-border rounded"></div>
            </div>
            <div className="flex flex-col justify-center text-p4 text-text-text-and-icon gap-y-4">
              <div className="h-6 w-4 bg-bg-grid-border rounded"></div>
              <div className="h-2 w-14 bg-bg-grid-border rounded"></div>
            </div>
            <div className="flex flex-col justify-center text-p4 text-text-text-and-icon gap-y-4">
              <div className="h-6 w-4 bg-bg-grid-border rounded"></div>
              <div className="h-2 w-14 bg-bg-grid-border rounded"></div>
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
      <div className="dark:bg-bg-grid-default bg-df-gray-100 border-[1px] dark:border-bg-grid-default border-df-gray-300 absolute -top-[48px] left-[4px] rounded-full p-4 dark:shadow-none shadow-[0_0_4px_0px_rgba(34,34,34,0.20)]">
        <RegistryLogos
          registryType={registry.type as unknown as keyof typeof RegistryType}
        />
      </div>

      <span className="ml-[102px] flex items-center gap-2 text-t4 uppercase text-text-input-value">
        {name}
      </span>
    </div>
  );
};

const Registry = ({ registry }: { registry: RegistryResponseType }) => {
  return (
    <DFLink className="flex flex-col" to={`/registries/${registry.type}`} unstyled>
      <Card
        className={cn(
          'relative group py-3 px-4 flex flex-col',
          'bg-bg-card hover:outline outline-2 outline-bg-hover-3 hover:shadow-[0px_0px_6px_1px_#044AFF]',
          "before:content-none hover:before:content-[''] before:w-[78px] before:h-[78px]",
          'before:bg-bg-hover-3 before:hover:shadow-[0px_0px_7px_-1px_#044AFF] before:absolute before:-top-[38px]',
          'before:left-[18px] before:rounded-full before:-z-10 cursor-pointer',
        )}
        key={registry.type}
      >
        <CardHeader registry={registry} />
        <div className="flex mt-4 gap-x-[48px] justify-center items-center w-[322px]">
          <div className="flex flex-col justify-center text-p4a text-text-text-and-icon">
            <span className="text-h1 dark:text-text-input-value text-text-text-and-icon">
              {abbreviateNumber(registry.registries ?? 0)}
            </span>
            Registries
          </div>
          <div className="flex flex-col justify-center text-p4a text-text-text-and-icon">
            <span className="text-h1 dark:text-text-input-value text-text-text-and-icon">
              {abbreviateNumber(registry.images ?? 0)}
            </span>
            Images
          </div>
          <div className="flex flex-col justify-center text-p4a text-text-text-and-icon">
            <span className="text-h1 dark:text-text-input-value text-text-text-and-icon">
              {abbreviateNumber(registry.tags ?? 0)}
            </span>
            Tags
          </div>
        </div>
      </Card>
    </DFLink>
  );
};

const RegistryList = () => {
  const { data } = useSuspenseQuery({
    ...queries.registry.registrySummary(),
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
      <BreadcrumbWrapper>
        <Breadcrumb>
          <BreadcrumbLink
            icon={<RegistryIcon />}
            className="text-text-input-value leading-[30px]"
          >
            Registries
          </BreadcrumbLink>
        </Breadcrumb>
      </BreadcrumbWrapper>
      <Suspense
        fallback={
          <div className="mx-4 my-14 flex gap-x-4 gap-y-14 flex-wrap">
            <RegistrySkeleton />
          </div>
        }
      >
        <div className="mx-4 my-14 flex gap-x-4 gap-y-14 flex-wrap">
          <RegistryList />
        </div>
      </Suspense>
    </>
  );
};

export const module = {
  element: <Registries />,
};
