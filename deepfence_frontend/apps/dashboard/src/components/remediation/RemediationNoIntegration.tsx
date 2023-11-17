import { DFLink } from '@/components/DFLink';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';

export const RemediationNoIntegration = () => {
  return (
    <div className="mt-8 px-5">
      <div className="h-10 w-10 mx-auto">
        <ErrorStandardLineIcon />
      </div>
      <div className="text-center text-xl mt-4">
        No Generative AI integrations configured
      </div>
      <div className="text-center text-p2 mt-2">
        Please go to{' '}
        <DFLink to="/integrations/gen-ai/add">Add Generative AI integrations</DFLink> page
        to add one now!
      </div>
    </div>
  );
};
