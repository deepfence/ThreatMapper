import { ComponentProps, useCallback, useState } from 'react';
import { SlidingModal, SlidingModalCloseButton } from 'ui-components';

import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { Container } from '@/features/topology/data-components/node-details/Container';
import { ContainerImage } from '@/features/topology/data-components/node-details/ContainerImage';
import { Host } from '@/features/topology/data-components/node-details/Host';
import { Pod } from '@/features/topology/data-components/node-details/Pod';
import { Process } from '@/features/topology/data-components/node-details/Process';

export const NodeDetailsStackedModal = ({
  open,
  onOpenChange,
  node,
  onStartScanClick,
}: {
  open: boolean;
  onOpenChange: ComponentProps<typeof SlidingModal>['onOpenChange'];
  node: {
    nodeId: string;
    nodeType: string;
  };
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
}) => {
  const [stack, setStack] = useState<Array<typeof node>>([node]);
  const lastNode = stack[stack.length - 1];
  const showBackBtn = stack.length > 1;

  const onGoBack = useCallback(() => {
    setStack((prevStack) => {
      if (prevStack.length <= 1) {
        return prevStack;
      }
      return prevStack.slice(0, -1);
    });
  }, [stack]);

  return (
    <SlidingModal open={open} onOpenChange={onOpenChange} width="w-[min(650px,90%)]">
      <SlidingModalCloseButton />
      {lastNode.nodeType === 'host' ? (
        <Host
          onStartScanClick={onStartScanClick}
          nodeId={lastNode.nodeId}
          showBackBtn={showBackBtn}
          onGoBack={onGoBack}
          onNodeClick={(nodeId, nodeType) => {
            setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
          }}
        />
      ) : null}
      {lastNode.nodeType === 'container' ? (
        <Container
          onStartScanClick={onStartScanClick}
          nodeId={lastNode.nodeId}
          showBackBtn={showBackBtn}
          onGoBack={onGoBack}
          onNodeClick={(nodeId, nodeType) => {
            setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
          }}
        />
      ) : null}
      {lastNode.nodeType === 'process' ? (
        <Process
          onStartScanClick={onStartScanClick}
          nodeId={lastNode.nodeId}
          showBackBtn={showBackBtn}
          onGoBack={onGoBack}
          onNodeClick={(nodeId, nodeType) => {
            setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
          }}
        />
      ) : null}
      {lastNode.nodeType === 'container_image' ? (
        <ContainerImage
          onStartScanClick={onStartScanClick}
          nodeId={lastNode.nodeId}
          showBackBtn={showBackBtn}
          onGoBack={onGoBack}
          onNodeClick={(nodeId, nodeType) => {
            setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
          }}
        />
      ) : null}
      {lastNode.nodeType === 'pod' ? (
        <Pod
          onStartScanClick={onStartScanClick}
          nodeId={lastNode.nodeId}
          showBackBtn={showBackBtn}
          onGoBack={onGoBack}
          onNodeClick={(nodeId, nodeType) => {
            setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
          }}
        />
      ) : null}
    </SlidingModal>
  );
};
