import { Suspense } from 'react';
import { generatePath } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink, CircleSpinner } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import {
  usePageParams,
  useScanResults,
} from '@/features/postures/components/scan-result/cloud/hooks';
import { providersToNameMapping } from '@/features/postures/pages/Posture';

export const Header = () => {
  return (
    <BreadcrumbWrapper>
      <>
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<PostureIcon />} isLink>
            <DFLink to={'/posture'} unstyled>
              Posture
            </DFLink>
          </BreadcrumbLink>
          <Suspense
            fallback={
              <BreadcrumbLink isLast>
                <CircleSpinner size="sm" />
              </BreadcrumbLink>
            }
          >
            <DynamicBreadcrumbs />
          </Suspense>
        </Breadcrumb>
      </>
    </BreadcrumbWrapper>
  );
};
const DynamicBreadcrumbs = () => {
  const { data } = useScanResults();
  const { scanStatusResult } = data;

  const { node_name } = scanStatusResult ?? {};
  const params = usePageParams();

  return (
    <>
      <BreadcrumbLink isLink asChild>
        <DFLink
          to={generatePath('/posture/accounts/:nodeType', {
            nodeType: params.nodeType,
          })}
          unstyled
        >
          {providersToNameMapping[params.nodeType]}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink isLast>
        <span className="inherit cursor-auto">{node_name}</span>
      </BreadcrumbLink>
    </>
  );
};
