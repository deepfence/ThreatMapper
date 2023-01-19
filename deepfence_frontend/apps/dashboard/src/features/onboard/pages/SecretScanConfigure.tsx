import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const SecretScanConfigure = () => {
  const { goBack } = usePageNavigation();
  return (
    <>
      <ConnectorHeader
        title="Configure Secret Scan"
        description="Just click the start scan button to start your secret scanning"
      />
      <section className="flex">
        <div></div>
        <Button size="sm" color="primary" className="ml-auto">
          Start scan
        </Button>
      </section>

      <Button onClick={goBack} color="default" size="xs" className="mt-16">
        Go Back
      </Button>
    </>
  );
};
