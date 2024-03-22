import { ComponentProps, useCallback, useState } from 'react';
import { SlidingModal, SlidingModalCloseButton } from 'ui-components';

import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { CloudService } from '@/features/topology/data-components/node-details/CloudService';
import { Container } from '@/features/topology/data-components/node-details/Container';
import { ContainerImage } from '@/features/topology/data-components/node-details/ContainerImage';
import { Host } from '@/features/topology/data-components/node-details/Host';
import { Pod } from '@/features/topology/data-components/node-details/Pod';
import { Process } from '@/features/topology/data-components/node-details/Process';
import { isCloudServiceNode } from '@/features/topology/utils/expand-collapse';

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
    defaultTab?: string;
    parentId?: string; // in case of cloud service node, this is the region
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

  const setCurrentTab = (defaultTab: string) => {
    setStack((prevStack) => {
      prevStack[prevStack.length - 1].defaultTab = defaultTab;
      return prevStack;
    });
  };

  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  return (
    <>
      <SlidingModal open={open} onOpenChange={onOpenChange} size="xxl">
        <SlidingModalCloseButton />
        {lastNode.nodeType === 'host' ? (
          <Host
            onStartScanClick={(scanOptions) => {
              setScanOptions(scanOptions);
            }}
            nodeId={lastNode.nodeId}
            showBackBtn={showBackBtn}
            onGoBack={onGoBack}
            onTabChange={setCurrentTab}
            defaultTab={lastNode.defaultTab}
            onNodeClick={(nodeId, nodeType) => {
              setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
            }}
          />
        ) : null}
        {lastNode.nodeType === 'container' ? (
          <Container
            onStartScanClick={(scanOptions) => {
              setScanOptions(scanOptions);
            }}
            nodeId={lastNode.nodeId}
            showBackBtn={showBackBtn}
            onGoBack={onGoBack}
            onTabChange={setCurrentTab}
            defaultTab={lastNode.defaultTab}
            onNodeClick={(nodeId, nodeType) => {
              setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
            }}
          />
        ) : null}
        {lastNode.nodeType === 'process' ? (
          <Process
            onStartScanClick={(scanOptions) => {
              setScanOptions(scanOptions);
            }}
            nodeId={lastNode.nodeId}
            showBackBtn={showBackBtn}
            onGoBack={onGoBack}
            onTabChange={setCurrentTab}
            defaultTab={lastNode.defaultTab}
            onNodeClick={(nodeId, nodeType) => {
              setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
            }}
          />
        ) : null}
        {lastNode.nodeType === 'container_image' ? (
          <ContainerImage
            onStartScanClick={(scanOptions) => {
              setScanOptions(scanOptions);
            }}
            nodeId={lastNode.nodeId}
            showBackBtn={showBackBtn}
            onGoBack={onGoBack}
            onTabChange={setCurrentTab}
            defaultTab={lastNode.defaultTab}
            onNodeClick={(nodeId, nodeType) => {
              setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
            }}
          />
        ) : null}
        {lastNode.nodeType === 'pod' ? (
          <Pod
            onStartScanClick={(scanOptions) => {
              setScanOptions(scanOptions);
            }}
            nodeId={lastNode.nodeId}
            showBackBtn={showBackBtn}
            onGoBack={onGoBack}
            onTabChange={setCurrentTab}
            defaultTab={lastNode.defaultTab}
            onNodeClick={(nodeId, nodeType) => {
              setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
            }}
          />
        ) : null}
        {isCloudServiceNode({ type: lastNode.nodeType }) ? (
          <CloudService
            onStartScanClick={(scanOptions) => {
              setScanOptions(scanOptions);
            }}
            region={lastNode.parentId ?? ''}
            nodeType={lastNode.nodeType}
            showBackBtn={showBackBtn}
            onGoBack={onGoBack}
            onNodeClick={(nodeId, nodeType) => {
              setStack((prevStack) => [...prevStack, { nodeId, nodeType }]);
            }}
          />
        ) : null}
      </SlidingModal>
      {!!scanOptions && (
        <ConfigureScanModal
          open
          onOpenChange={() => setScanOptions(undefined)}
          scanOptions={scanOptions}
        />
      )}
    </>
  );
};
