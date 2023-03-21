import { ComponentProps, useCallback, useState } from 'react';
import { SlidingModal, SlidingModalCloseButton } from 'ui-components';

import { Container } from '@/features/topology/data-components/node-details/Container';
import { Host } from '@/features/topology/data-components/node-details/Host';

export const NodeDetailsStackedModal = ({
  open,
  onOpenChange,
  node,
}: {
  open: boolean;
  onOpenChange: ComponentProps<typeof SlidingModal>['onOpenChange'];
  node: {
    nodeId: string;
    nodeType: string;
  };
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
