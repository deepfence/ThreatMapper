import { generatePath, useParams } from 'react-router-dom';
import {
  Button,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalHeader,
} from 'ui-components';

import { RegistryConnectorForm } from '@/features/common/data-component/RegistryConnectorForm';
import { registryTypeToNameMapping } from '@/types/common';
import { usePageNavigation } from '@/utils/usePageNavigation';

const Header = ({ title }: { title: string }) => {
  return (
    <SlidingModalHeader>
      <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-breadcrumb-bar">
        Add Registry: &nbsp;{registryTypeToNameMapping[title]}
      </div>
    </SlidingModalHeader>
  );
};
export const AddRegistryModal = ({
  open,
  setAddRegistryModal,
}: {
  open: boolean;
  setAddRegistryModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { navigate } = usePageNavigation();
  const { account } = useParams() as {
    account: string;
  };

  if (!account) {
    throw new Error('Account Type is required');
  }

  return (
    <>
      <SlidingModal
        modal={false}
        open={open}
        onOpenChange={() => {
          setAddRegistryModal(false);
        }}
        size="l"
      >
        <SlidingModalCloseButton />
        <Header title={account} />
        <div className="m-4 overflow-auto">
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
              <div className="mt-8 flex gap-x-2">
                <Button
                  size="md"
                  color="default"
                  type="submit"
                  disabled={state !== 'idle'}
                  loading={state !== 'idle'}
                >
                  Add registry
                </Button>
                <Button
                  type="button"
                  size="md"
                  color="default"
                  variant="outline"
                  onClick={() => setAddRegistryModal(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          />
        </div>
      </SlidingModal>
    </>
  );
};
