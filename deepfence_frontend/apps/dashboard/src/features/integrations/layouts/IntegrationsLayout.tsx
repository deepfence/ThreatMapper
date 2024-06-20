import { Outlet, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { IntegrationsIcon } from '@/components/sideNavigation/icons/Integrations';
import { getIntegratinPrettyName } from '@/features/integrations/components/integration-form/utils';

const IntegrationsLayout = () => {
  const params = useParams() as {
    integrationType: string;
  };

  if (!params.integrationType) {
    throw new Error('Integration Type is required');
  }

  return (
    <>
      <div className="px-4 py-2 w-full items-center bg-bg-breadcrumb-bar dark:border-none border-b border-bg-grid-border">
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<IntegrationsIcon />} isLink>
            <DFLink to={'/integrations'} unstyled>
              Integrations
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">
              {getIntegratinPrettyName(params.integrationType)}
            </span>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>

      <Outlet />
    </>
  );
};
export const module = {
  element: <IntegrationsLayout />,
};
