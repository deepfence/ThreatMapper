import { useState } from 'react';
import { SlidingModal, SlidingModalCloseButton } from 'ui-components';

import { CloudService } from '@/features/topology/data-components/node-details/CloudService';
import { Container } from '@/features/topology/data-components/node-details/Container';
import { ContainerImage } from '@/features/topology/data-components/node-details/ContainerImage';
import { Host } from '@/features/topology/data-components/node-details/Host';
import { Pod } from '@/features/topology/data-components/node-details/Pod';
import { Process } from '@/features/topology/data-components/node-details/Process';

interface HostNodeDetailModalStackItem {
  kind: 'host';
  nodeId: string;
  tab?: string;
}

interface ContainerDetailModalStackItem {
  kind: 'container';
  nodeId: string;
  tab?: string;
}

interface ContainerImageDetailModalStackItem {
  kind: 'container_image';
  nodeId: string;
  tab?: string;
}

interface ProcessDetailModalStackItem {
  kind: 'process';
  nodeId: string;
  tab?: string;
}

interface PodDetailModalStackItem {
  kind: 'pod';
  nodeId: string;
  tab?: string;
}

interface CloudServiceDetailModalStackItem {
  kind: 'cloud_service';
  nodeType: string;
  region: string;
}

export type GlobalModalStackItem =
  | HostNodeDetailModalStackItem
  | ContainerDetailModalStackItem
  | ContainerImageDetailModalStackItem
  | ProcessDetailModalStackItem
  | PodDetailModalStackItem
  | CloudServiceDetailModalStackItem;

export function useDetailModalState(
  initialState?: GlobalModalStackItem | (() => GlobalModalStackItem | null) | null,
) {
  const [item, setItem] = useState<GlobalModalStackItem | null>(initialState ?? null);
  return {
    setDetailModalItem: setItem,
    detailModalItem: item,
  };
}

export function DetailModal({
  itemInfo,
  onItemClose,
}: {
  itemInfo: GlobalModalStackItem;
  onItemClose: () => void;
}) {
  const kind = itemInfo.kind;
  switch (kind) {
    case 'host': {
      return (
        <SlidingModal
          size="xxl"
          open={true}
          onOpenChange={(open) => {
            if (!open) onItemClose();
          }}
        >
          <SlidingModalCloseButton />
          <Host nodeId={itemInfo.nodeId} defaultTab={itemInfo.tab} />
        </SlidingModal>
      );
    }
    case 'container': {
      return (
        <SlidingModal
          size="xxl"
          open={true}
          onOpenChange={(open) => {
            if (!open) onItemClose();
          }}
        >
          <SlidingModalCloseButton />
          <Container nodeId={itemInfo.nodeId} defaultTab={itemInfo.tab} />
        </SlidingModal>
      );
    }
    case 'container_image': {
      return (
        <SlidingModal
          size="xxl"
          open={true}
          onOpenChange={(open) => {
            if (!open) onItemClose();
          }}
        >
          <SlidingModalCloseButton />
          <ContainerImage nodeId={itemInfo.nodeId} defaultTab={itemInfo.tab} />
        </SlidingModal>
      );
    }
    case 'process': {
      return (
        <SlidingModal
          size="xxl"
          open={true}
          onOpenChange={(open) => {
            if (!open) onItemClose();
          }}
        >
          <SlidingModalCloseButton />
          <Process nodeId={itemInfo.nodeId} defaultTab={itemInfo.tab} />
        </SlidingModal>
      );
    }
    case 'pod': {
      return (
        <SlidingModal
          size="xxl"
          open={true}
          onOpenChange={(open) => {
            if (!open) onItemClose();
          }}
        >
          <SlidingModalCloseButton />
          <Pod nodeId={itemInfo.nodeId} defaultTab={itemInfo.tab} />
        </SlidingModal>
      );
    }
    case 'cloud_service': {
      return (
        <SlidingModal
          size="xxl"
          open={true}
          onOpenChange={(open) => {
            if (!open) onItemClose();
          }}
        >
          <SlidingModalCloseButton />
          <CloudService nodeType={itemInfo.nodeType} region={itemInfo.region} />
        </SlidingModal>
      );
    }
  }

  const exhaustiveCheck: never = kind;
  throw new Error(`Unhandled node type: ${exhaustiveCheck}`);
}
