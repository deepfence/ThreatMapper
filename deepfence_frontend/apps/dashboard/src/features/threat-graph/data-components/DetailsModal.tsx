import React, { useEffect, useMemo } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import {
  CircleSpinner,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import { getLookupApiClient } from '@/api/api';
import { GraphNodeInfo, ModelCloudResource, ModelHost } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import { ScanTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
import { getScanLink } from '@/utils/scan';

const action = async ({
  request,
}: ActionFunctionArgs): Promise<(ModelHost | ModelCloudResource)[]> => {
  const formData = await request.formData();
  const nodeIds = formData.getAll('nodeIds') as string[];
  const nodeType = formData.get('nodeType');
  if (!nodeIds?.length || !nodeType) {
    return [];
  }
  if (nodeType === 'host') {
    const hostLookupResult = await makeRequest({
      apiFunction: getLookupApiClient().lookupHost,
      apiArgs: [
        {
          lookupLookupFilter: {
            in_field_filter: [],
            node_ids: nodeIds,
            window: {
              offset: 0,
              size: nodeIds.length,
            },
          },
        },
      ],
    });
    if (ApiError.isApiError(hostLookupResult)) {
      throw new Error('Error getting hostLookupResult');
    }
    return hostLookupResult;
  } else {
    const cloudResourceLookup = await makeRequest({
      apiFunction: getLookupApiClient().lookupCloudResources,
      apiArgs: [
        {
          lookupLookupFilter: {
            in_field_filter: [],
            node_ids: nodeIds,
            window: {
              offset: 0,
              size: nodeIds.length,
            },
          },
        },
      ],
    });
    if (ApiError.isApiError(cloudResourceLookup)) {
      throw new Error('Error getting cloudResourceLookup');
    }
    return cloudResourceLookup;
  }
};

export interface DetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes?: { [key: string]: GraphNodeInfo } | null;
  label: string;
  nodeType: string;
}

export const DetailsModal = ({
  open,
  onOpenChange,
  nodes,
  label,
  nodeType,
}: DetailsModalProps) => {
  const fetcher = useFetcher<Awaited<ReturnType<typeof action>>>();

  useEffect(() => {
    if (!nodes) return;
    if (!Object.keys(nodes).length) return;
    const formData = new FormData();
    Object.keys(nodes).forEach((nodeId) => {
      formData.append('nodeIds', nodeId);
    });
    formData.append('nodeType', nodeType);
    fetcher.submit(formData, {
      method: 'post',
      action: '/data-component/threat-graph/details-modal',
    });
  }, [nodes]);

  const data = useMemo(() => {
    if (!fetcher.data) return null;
    if (!fetcher.data.length) return [];
    return Object.keys(nodes ?? {}).map((nodeId) => {
      const node = nodes![nodeId];
      const nodeData = fetcher.data?.find((item) => item.node_id === node.node_id);
      return {
        ...node,
        latest_vulnerability_scan_id: nodeData?.vulnerability_latest_scan_id,
        latest_secret_scan_id: nodeData?.secret_latest_scan,
        latest_malware_scan_id: nodeData?.malware_latest_scan_id,
        latest_compliance_scan_id: nodeData?.compliance_latest_scan_id,
        latest_cloud_compliance_scan_id: nodeData?.cloud_compliance_latest_scan_id,
      };
    });
  }, [fetcher.data, nodes]);

  return (
    <SlidingModal open={open} onOpenChange={onOpenChange} width="w-[min(650px,90%)]">
      <SlidingModalCloseButton />
      <SlidingModalHeader>
        <div className="flex gap-2 items-center flex-1">
          <div className="w-6 h-6">
            <img src={getNodeImage(nodeType)} alt={nodeType} width="100%" height="100%" />
          </div>
          <div className="uppercase">
            {label} ({Object.keys(nodes ?? {}).length})
          </div>
        </div>
      </SlidingModalHeader>
      <SlidingModalContent>
        {!data ? (
          <div className="h-full w-full flex items-center justify-center">
            <CircleSpinner size="xl" />
          </div>
        ) : (
          data.map((item) => (
            <div key={item.node_id} className="mb-4">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {item.node_id}
              </div>
              <div className="flex items-center justify-start gap-2 mt-2">
                {item.vulnerability_count ? (
                  <CountCard
                    count={item.vulnerability_count}
                    nodeType={nodeType}
                    scanType={ScanTypeEnum.VulnerabilityScan}
                    scanId={item.latest_vulnerability_scan_id}
                  />
                ) : null}
                {item.secrets_count ? (
                  <CountCard
                    count={item.secrets_count}
                    nodeType={nodeType}
                    scanType={ScanTypeEnum.SecretScan}
                    scanId={item.latest_secret_scan_id}
                  />
                ) : null}
                {item.compliance_count ? (
                  <CountCard
                    count={item.compliance_count}
                    nodeType={nodeType}
                    scanType={ScanTypeEnum.ComplianceScan}
                    scanId={item.latest_compliance_scan_id}
                  />
                ) : null}
                {item.cloud_compliance_count ? (
                  <CountCard
                    count={item.cloud_compliance_count}
                    nodeType={nodeType}
                    scanType={ScanTypeEnum.CloudComplianceScan}
                    scanId={item.latest_cloud_compliance_scan_id}
                  />
                ) : null}
              </div>
            </div>
          ))
        )}
      </SlidingModalContent>
    </SlidingModal>
  );
};

const SCAN_TYPE_MAP: Record<ScanTypeEnum, { label: string; logo: () => JSX.Element }> = {
  [ScanTypeEnum.VulnerabilityScan]: {
    label: 'Vulnerabilities',
    logo: VulnerabilityIcon,
  },
  [ScanTypeEnum.SecretScan]: {
    label: 'Secrets',
    logo: SecretsIcon,
  },
  [ScanTypeEnum.MalwareScan]: {
    label: 'Malware',
    logo: MalwareIcon,
  },
  [ScanTypeEnum.ComplianceScan]: {
    label: 'Compliance',
    logo: PostureIcon,
  },
  [ScanTypeEnum.CloudComplianceScan]: {
    label: 'Compliance',
    logo: PostureIcon,
  },
};

const CountCard = ({
  count,
  nodeType,
  scanId,
  scanType,
}: {
  count: number;
  scanId?: string;
  nodeType: string;
  scanType: ScanTypeEnum;
}) => {
  const Logo = SCAN_TYPE_MAP[scanType].logo;
  const label = SCAN_TYPE_MAP[scanType].label;

  const Wrapper = ({
    className,
    children,
  }: {
    className: string;
    children: React.ReactNode;
  }) => {
    if (scanId) {
      return (
        <DFLink
          to={getScanLink({ nodeType, scanType, scanId })}
          target="_blank"
          className={twMerge(
            'visited:text-red-700 dark:visited:text-red-400 focus:no-underline dark:focus:no-underline hover:no-underline dark:hover:no-underline active:no-underline dark:active:no-underline',
            className,
          )}
        >
          {children}
        </DFLink>
      );
    }
    return <div className={className}>{children}</div>;
  };
  return (
    <Wrapper className="w-full h-full flex-1 max-w-[30%] flex items-center justify-center flex-col bg-red-100 text-red-600 dark:bg-red-600/10 dark:text-red-400 rounded-lg py-4">
      <div className="flex justify-center gap-2 items-center">
        <div className="w-8 h-8 flex">
          <Logo />
        </div>
        <div className="text-[2rem] flex items-center">{count}</div>
      </div>
      <div>{label}</div>
    </Wrapper>
  );
};

export const module = {
  action,
};
