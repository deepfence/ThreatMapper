import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import {
  CircleSpinner,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import { TruncatedText } from '@/components/TruncatedText';
import { SlidingModalHeaderWrapper } from '@/features/common/SlidingModalHeaderWrapper';
import {
  Metadata,
  toTopologyMetadataString,
} from '@/features/topology/components/node-details/Metadata';
import { queries } from '@/queries';

const useResourceDetails = ({ nodeId }: { nodeId: string }) => {
  return useSuspenseQuery({
    ...queries.lookup.containerImage({
      nodeId: nodeId,
    }),
  });
};

const Content = ({ nodeId }: { nodeId: string }) => {
  const { data } = useResourceDetails({
    nodeId,
  });
  return (
    <div className="mx-4 mt-4">
      <Metadata
        title=""
        data={{
          node_name: toTopologyMetadataString(data?.imageData?.node_name),
          docker_image_name: toTopologyMetadataString(data?.imageData?.docker_image_name),
          docker_image_tag: toTopologyMetadataString(data?.imageData?.docker_image_tag),
          docker_image_size: toTopologyMetadataString(data?.imageData?.docker_image_size),
          docker_image_created_at: toTopologyMetadataString(
            data?.imageData?.docker_image_created_at,
          ),
          docker_image_id: toTopologyMetadataString(data?.imageData?.docker_image_id),
        }}
      />
    </div>
  );
};
export const ResourceDetailModal = ({
  nodeId,
  open,
  onClose,
}: {
  nodeId: string;
  open: boolean;
  onClose: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <SlidingModal
      open={open}
      onOpenChange={(state) => {
        onClose(state);
      }}
      size="m"
    >
      <SlidingModalCloseButton />
      <SlidingModalHeader>
        <SlidingModalHeaderWrapper>
          <div className="overflow-hidden">
            <TruncatedText text="Resource details" />
          </div>
        </SlidingModalHeaderWrapper>
      </SlidingModalHeader>
      <SlidingModalContent>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <CircleSpinner size="lg" />
            </div>
          }
        >
          <Content nodeId={nodeId} />
        </Suspense>
      </SlidingModalContent>
    </SlidingModal>
  );
};
