import { startCase } from 'lodash-es';
import { HiChevronRight } from 'react-icons/hi';
import { generatePath, Outlet, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink } from 'ui-components';

import { DFLink } from '@/components/DFLink';

const RegistryConnectorLayout = () => {
  const params = useParams() as {
    account: string;
  };

  if (!params.account) {
    throw new Error('Account Type is required');
  }

  return (
    <>
      <div className="flex p-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <DFLink
              to={generatePath('/registries/:account', {
                account: params.account,
              })}
            >
              Registries
            </DFLink>
          </BreadcrumbLink>

          <BreadcrumbLink>
            <span className="inherit cursor-auto">New</span>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">{startCase(params.account)}</span>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>

      <div className="p-2">
        <Outlet />
      </div>
    </>
  );
};
export const module = {
  element: <RegistryConnectorLayout />,
};
