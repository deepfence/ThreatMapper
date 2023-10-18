import { useSuspenseQuery } from '@suspensive/react-query';
import {
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import { TruncatedText } from '@/components/TruncatedText';
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
export const ResourceDetailModal = ({
  nodeId,
  open,
  onClose,
}: {
  nodeId: string;
  open: boolean;
  onClose: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { data } = useResourceDetails({
    nodeId,
  });

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
        <div className="p-4 text-h3 dark:text-text-text-and-icon dark:bg-bg-breadcrumb-bar ">
          <div className="overflow-hidden">
            <TruncatedText text="Resource details" />
          </div>
        </div>
      </SlidingModalHeader>
      <SlidingModalContent>
        <div className="mx-4 mt-4">
          <Metadata
            title=""
            data={{
              node_name: toTopologyMetadataString(data?.imageData?.node_name),
              docker_image_name: toTopologyMetadataString(
                data?.imageData?.docker_image_name,
              ),
              docker_image_tag: toTopologyMetadataString(
                data?.imageData?.docker_image_tag,
              ),
              docker_image_size: toTopologyMetadataString(
                data?.imageData?.docker_image_size,
              ),
              docker_image_created_at: toTopologyMetadataString(
                data?.imageData?.docker_image_created_at,
              ),
              docker_image_id: toTopologyMetadataString(data?.imageData?.docker_image_id),
            }}
          />
        </div>
      </SlidingModalContent>
    </SlidingModal>
  );
};
