import { Button, Checkbox, Switch, Typography } from 'ui-components';

import { usePageNavigation } from '../../../utils/usePageNavigation';
import { ConnectorHeader } from '../components/ConnectorHeader';

const packages = [
  {
    name: 'OS Packages',
  },
  {
    name: 'Java',
  },
  {
    name: 'Javascript',
  },
  {
    name: 'Rust',
  },
  {
    name: 'GoLang',
  },
  {
    name: 'Ruby',
  },
  {
    name: 'Python',
  },
  {
    name: 'PHP',
  },
  {
    name: 'Dotnet',
  },
];

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
        >
          Packages
        </h6>
      </section>

      <Button onClick={goBack} color="default" size="xs" className="mt-16">
        Cancel
      </Button>
    </>
  );
};
