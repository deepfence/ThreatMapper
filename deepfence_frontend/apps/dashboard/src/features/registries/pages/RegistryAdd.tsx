import { generatePath, useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { RegistryConnectorForm } from '@/features/common/data-component/RegistryConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

const RegistryAdd = () => {
  const { navigate } = usePageNavigation();
  const { account, nodeId } = useParams() as {
    account: string;
    nodeId: string;
  };

  if (!account) {
    throw new Error('Account Type is required');
  }

  return (
    <>
      <RegistryConnectorForm
        onSuccess={() => {
          navigate(
            generatePath('/registries/:account/:nodeId', {
              account,
              nodeId,
            }),
          );
        }}
        registryType={account}
        renderButton={() => (
          <div className="flex ml-auto">
            <Button color="primary" size="xs" className="ml-auto" type="submit">
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
