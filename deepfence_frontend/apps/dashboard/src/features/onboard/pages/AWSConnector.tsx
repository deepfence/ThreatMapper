import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { AWSCloudFormation } from '@/features/onboard/components/connectors/clouds/AWSCloudFormation';
import { AWSTerraform } from '@/features/onboard/components/connectors/clouds/AWSTerraform';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const AWSConnector = () => {
  const { goBack } = usePageNavigation();
  return (
    <div>
      <ConnectorHeader
        title="Connect an AWS Account"
        description="Deploy all modules for Deepfence Compliance Scanner for a single account. For information on AWS Organization and account types, see AWS docs."
      />
      <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
        <AWSCloudFormation />
        <AWSTerraform />
      </div>
      <Button onClick={goBack} size="xs" color="default">
        Go Back
      </Button>
    </div>
  );
};
