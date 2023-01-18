import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const SecretScanConfigure = () => {
  const { goBack } = usePageNavigation();
  return (
    <>
      <ConnectorHeader
        title="Configure your scan"
        description="Just click the start scan button to start your secret scanning"
        metadata={{
          accountId: '234HTY6643',
          type: 'Host',
        }}
      />
      <section>
        <Button size="xs" color="primary">
          Start scan
        </Button>
      </section>

      <Button onClick={goBack} color="default" size="xs" className="mt-16">
        Go Back
      </Button>
    </>
  );
};
