import { startCase } from 'lodash-es';
import { HiChevronRight } from 'react-icons/hi';
import { generatePath, Outlet, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { providersToNameMapping } from '@/features/postures/pages/Posture';

const PostureConnectorLayout = () => {
  const params = useParams() as {
    account: string;
  };

  return (
    <>
      <div className="flex p-2  w-full items-center shadow bg-white dark:bg-gray-800">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <DFLink to="/posture">Posture</DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <DFLink
              to={generatePath('/posture/accounts/:nodeType', {
                nodeType: params.account,
              })}
            >
              {providersToNameMapping[params.account]}
            </DFLink>
          </BreadcrumbLink>

          <BreadcrumbLink>
            <span className="inherit cursor-auto">New</span>
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
  element: <PostureConnectorLayout />,
};
