import { Button, Typography } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const SecretScanConfigure = () => {
  const { goBack } = usePageNavigation();
  return (
    <>
      <ConnectorHeader
        title="Configure your scan"
        description="Choose from the below options to perform your first scan."
        metadata={{
          accountId: '234HTY6643',
          type: 'Host',
        }}
      />
      <section>
        <h6
          className={`${Typography.size.lg} ${Typography.weight.medium} mt-4 dark:text-white`}
        ></h6>
      </section>

      <Button onClick={goBack} color="default" size="xs" className="mt-16">
        Go Back
      </Button>
    </>
  );
};
