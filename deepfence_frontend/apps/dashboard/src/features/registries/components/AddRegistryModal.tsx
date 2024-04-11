import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalHeader,
} from 'ui-components';

import { RegistryConnectorForm } from '@/features/common/data-component/RegistryConnectorForm';
import { SlidingModalHeaderWrapper } from '@/features/common/SlidingModalHeaderWrapper';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { registryTypeToNameMapping } from '@/types/common';

const Header = ({ title }: { title: string }) => {
  return (
    <SlidingModalHeader>
      <SlidingModalHeaderWrapper>
        Add Registry: &nbsp;{registryTypeToNameMapping[title]}
      </SlidingModalHeaderWrapper>
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
  const [isAddSuccess, sestIsAddSuccess] = useState(false);
  const { account } = useParams() as {
    account: string;
  };

  if (!account) {
    throw new Error('Account Type is required');
  }

  return (
    <>
      <SlidingModal
        open={open}
        onOpenChange={() => {
          sestIsAddSuccess(false);
          setAddRegistryModal(false);
        }}
        size="s"
      >
        <SlidingModalCloseButton />
        <Header title={account} />
        <div className="m-4 overflow-auto">
          {isAddSuccess ? (
            <SuccessModalContent text="Added successfully" />
          ) : (
            <RegistryConnectorForm
              onSuccess={() => {
                sestIsAddSuccess(true);
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
                    onClick={() => {
                      sestIsAddSuccess(false);
                      setAddRegistryModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            />
          )}
        </div>
      </SlidingModal>
    </>
  );
};
