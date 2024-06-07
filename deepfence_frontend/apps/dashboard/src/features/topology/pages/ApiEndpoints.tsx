import { Button } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { ArrowLine } from '@/components/icons/common/ArrowLine';

function ApiEndpoints() {
  return (
    <div className="flex flex-col justify-center items-center h-[80%]">
      <h3 className="text-p1 text-text-text-and-icon">
        Upgrade to ThreatStryker to view Api Endpoints.
      </h3>
      <DFLink
        unstyled
        className="my-4"
        href="https://deepfence.io/threatstryker/"
        target="_blank"
      >
        <Button
          color="success"
          endIcon={<ArrowLine className="rotate-90" />}
          className="bg-[#009852] dark:bg-[#15b77e]"
        >
          Get ThreatStryker
        </Button>
      </DFLink>
    </div>
  );
}
export const module = {
  element: <ApiEndpoints />,
};
