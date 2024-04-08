import { generatePath, Outlet, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { providersToNameMapping } from '@/features/postures/pages/Posture';

const PostureConnectorLayout = () => {
  const params = useParams() as {
    account: string;
  };

  return (
    <>
      <div className="flex pl-4 py-2 w-full bg-bg-breadcrumb-bar dark:border-none border-b border-bg-grid-border">
        <Breadcrumb>
          <BreadcrumbLink icon={<PostureIcon />} asChild isLink>
            <DFLink to="/posture" unstyled>
              Posture
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink icon={<PostureIcon />} asChild isLink>
            <DFLink
              to={generatePath('/posture/accounts/:nodeType', {
                nodeType: encodeURIComponent(params.account),
              })}
              unstyled
            >
              {providersToNameMapping[params.account]}
            </DFLink>
          </BreadcrumbLink>

          <BreadcrumbLink icon={<PostureIcon />}>
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
