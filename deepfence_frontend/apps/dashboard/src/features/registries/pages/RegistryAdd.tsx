import { generatePath, useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { RegistryConnectorForm } from '@/features/common/data-component/RegistryConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

const RegistryAdd = () => {
  const { navigate } = usePageNavigation();
  const { account } = useParams() as {
    account: string;
  };

  if (!account) {
    throw new Error('Account Type is required');
  }

  return (
    <>
      <RegistryConnectorForm
        onSuccess={() => {
          navigate(
            generatePath('/registries/:account', {
              account: encodeURIComponent(account),
            }),
          );
        }}
        registryType={account}
        renderButton={(state) => (
          <div className="flex ml-auto">
            <Button
              color="primary"
              size="xs"
              className="ml-auto"
              type="submit"
              disabled={state !== 'idle'}
              loading={state !== 'idle'}
            >
              Save information
            </Button>
          </div>
        )}
      />
    </>
  );
};

export const module = {
  element: <RegistryAdd />,
};
