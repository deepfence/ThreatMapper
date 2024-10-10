import React, { createContext, useContext } from 'react';
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

export const GlobalModalStackContext = createContext<{
  items: GlobalModalStackItem[];
  setItems: React.Dispatch<React.SetStateAction<GlobalModalStackItem[]>>;
}>({
  items: [],
  setItems: () => {
    /**noop */
  },
});

export function useGlobalModalStack() {
  const { items, setItems } = useContext(GlobalModalStackContext);
  const addGlobalModal = (item: GlobalModalStackItem) => {
    setItems((prev) => {
      return [...prev, item];
    });
  };
  const removeCurrentModal = () => {
    setItems((prev) => {
      return prev.slice(0, prev.length - 1);
    });
  };

  return { addGlobalModal, removeCurrentModal, globalModalStack: items };
}

export function GlobalModals() {
  const { globalModalStack, removeCurrentModal } = useGlobalModalStack();

  return globalModalStack.map((modalInfo, index) => {
    const kind = modalInfo.kind;
    switch (kind) {
      case 'host': {
        return (
          <SlidingModal
            size="xxl"
            open={true}
            onOpenChange={() => removeCurrentModal()}
            key={modalInfo.kind + modalInfo.nodeId + index}
          >
            <SlidingModalCloseButton />
            <Host nodeId={modalInfo.nodeId} defaultTab={modalInfo.tab} />
          </SlidingModal>
        );
      }
      case 'container': {
        return (
          <SlidingModal
            size="xxl"
            open={true}
            onOpenChange={() => removeCurrentModal()}
            key={modalInfo.kind + modalInfo.nodeId + index}
          >
            <SlidingModalCloseButton />
            <Container nodeId={modalInfo.nodeId} defaultTab={modalInfo.tab} />
          </SlidingModal>
        );
      }
      case 'container_image': {
        return (
          <SlidingModal size="xxl" open={true} onOpenChange={() => removeCurrentModal()}>
            <SlidingModalCloseButton />
            <ContainerImage
              nodeId={modalInfo.nodeId}
              defaultTab={modalInfo.tab}
              key={modalInfo.kind + modalInfo.nodeId + index}
            />
          </SlidingModal>
        );
      }
      case 'process': {
        return (
          <SlidingModal
            size="xxl"
            open={true}
            onOpenChange={() => removeCurrentModal()}
            key={modalInfo.kind + modalInfo.nodeId + index}
          >
            <SlidingModalCloseButton />
            <Process nodeId={modalInfo.nodeId} defaultTab={modalInfo.tab} />
          </SlidingModal>
        );
      }
      case 'pod': {
        return (
          <SlidingModal
            size="xxl"
            open={true}
            onOpenChange={() => removeCurrentModal()}
            key={modalInfo.kind + modalInfo.nodeId + index}
          >
            <SlidingModalCloseButton />
            <Pod nodeId={modalInfo.nodeId} defaultTab={modalInfo.tab} />
          </SlidingModal>
        );
      }
      case 'cloud_service': {
        return (
          <SlidingModal
            size="xxl"
            open={true}
            onOpenChange={() => removeCurrentModal()}
            key={modalInfo.kind + modalInfo.nodeType + modalInfo.region + index}
          >
            <SlidingModalCloseButton />
            <CloudService nodeType={modalInfo.nodeType} region={modalInfo.region} />
          </SlidingModal>
        );
      }
    }

    const exhaustiveCheck: never = kind;
    throw new Error(`Unhandled node type: ${exhaustiveCheck}`);
  });
}
