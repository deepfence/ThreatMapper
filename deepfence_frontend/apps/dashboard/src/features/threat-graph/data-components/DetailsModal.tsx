import { useSuspenseQuery } from '@suspensive/react-query';
import React, { Suspense, useMemo } from 'react';
import {
  CircleSpinner,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import { GraphNodeInfo, ModelCloudResource, ModelHost } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { ScanTypeEnum } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';
import { getScanLink } from '@/utils/scan';

function useLookupResources(
  nodeType: string,
  nodeIds: string[],
): (ModelHost | ModelCloudResource)[] | undefined {
  const hostQuery = useSuspenseQuery({
    ...queries.lookup.host({ nodeIds }),
    enabled: nodeType === 'host',
  });

  const cloudResourcesQuery = useSuspenseQuery({
    ...queries.lookup.cloudResources({ nodeIds }),
    enabled: nodeType !== 'host',
  });

  if (nodeType === 'host') return hostQuery.data?.hostData;
  return cloudResourcesQuery.data?.cloudResourcesData;
}

export interface DetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes?: { [key: string]: GraphNodeInfo } | null;
  label: string;
  nodeType: string;
  cloudId: string;
}

export const DetailsModal = ({
  open,
  onOpenChange,
  nodes,
  label,
  nodeType,
  cloudId,
}: DetailsModalProps) => {
  const { mode } = useTheme();
  return (
    <SlidingModal open={open} onOpenChange={onOpenChange} size="m">
      <SlidingModalCloseButton />
      <SlidingModalHeader>
        <div className="flex gap-2 items-center text-text-text-and-icon px-5 py-[22px] dark:bg-bg-header bg-bg-breadcrumb-bar">
          <div className="w-5 h-5 shrink-0">
            <img
              src={getNodeImage(mode, nodeType)}
              alt={nodeType}
              width="100%"
              height="100%"
            />
          </div>
          <div className="text-h3 capitalize">
            <TruncatedText text={label} />
          </div>
        </div>
      </SlidingModalHeader>
      <SlidingModalContent>
        <Suspense
          fallback={
            <div className="h-full w-full flex items-center justify-center">
              <CircleSpinner size="lg" />
            </div>
          }
        >
          <ModalContent nodeType={nodeType} nodes={nodes} cloudId={cloudId} />
        </Suspense>
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
    label: 'Posture',
    logo: PostureIcon,
  },
  [ScanTypeEnum.CloudComplianceScan]: {
    label: 'Posture',
    logo: PostureIcon,
  },
};

const ModalContent = ({
  nodes,
  nodeType,
  cloudId,
}: {
  nodes?: { [key: string]: GraphNodeInfo } | null;
  nodeType: string;
  cloudId: string;
}) => {
  const { mode } = useTheme();
  const data = useLookupResources(nodeType, Object.keys(nodes ?? {}));
  const nodesData = useMemo(() => {
    if (!data) return null;
    if (!data.length) return [];

    return Object.keys(nodes ?? {})
      .map((nodeId) => {
        const node = nodes![nodeId];
        const nodeData = data.find((item) => item.node_id === node.node_id);
        if (!nodeData) return null;
        if (nodeType === 'host') {
          return {
            ...node,
            latest_vulnerability_scan_id: (nodeData as ModelHost)
              ?.vulnerability_latest_scan_id,
            vulnerability_count: (nodeData as ModelHost)
              ?.exploitable_vulnerabilities_count,
            latest_secret_scan_id: (nodeData as ModelHost)?.secret_latest_scan_id,
            secrets_count: (nodeData as ModelHost)?.exploitable_secrets_count,
            latest_compliance_scan_id: (nodeData as ModelHost)?.compliance_latest_scan_id,
            compliance_count: (nodeData as ModelHost)?.warn_alarm_count,
            latest_cloud_compliance_scan_id: undefined,
          };
        }

        return {
          ...node,
          latest_cloud_compliance_scan_id: (nodeData as ModelCloudResource)
            ?.cloud_compliance_latest_scan_id,
          cloud_compliance_count: (nodeData as ModelHost)?.cloud_warn_alarm_count,
          latest_vulnerability_scan_id: undefined,
          latest_secret_scan_id: undefined,
          latest_compliance_scan_id: undefined,
        };
      })
      .filter((data) => !!data);
  }, [data]);
  return (
    <div className="py-7 px-5 flex flex-col gap-5">
      {nodesData?.map((item) => (
        <div key={item?.node_id} className="mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 shrink-0">
              <img
                src={getNodeImage(mode, nodeType)}
                alt={nodeType}
                width="100%"
                height="100%"
              />
            </div>
            <div className="text-h5 text-text-text-and-icon">{item?.node_id}</div>
          </div>
          <div className="flex items-center justify-start gap-4 py-3">
            {item?.vulnerability_count ? (
              <CountCard
                count={item.vulnerability_count}
                nodeType={nodeType}
                scanType={ScanTypeEnum.VulnerabilityScan}
                scanId={item.latest_vulnerability_scan_id}
                nodeId={item.node_id}
                cloudId={cloudId}
              />
            ) : null}
            {item?.secrets_count ? (
              <CountCard
                count={item.secrets_count}
                nodeType={nodeType}
                scanType={ScanTypeEnum.SecretScan}
                scanId={item.latest_secret_scan_id}
                cloudId={cloudId}
                nodeId={item.node_id}
              />
            ) : null}
            {item?.compliance_count ? (
              <CountCard
                count={item.compliance_count}
                nodeType={nodeType}
                scanType={ScanTypeEnum.ComplianceScan}
                scanId={item.latest_compliance_scan_id}
                cloudId={cloudId}
                nodeId={item.node_id}
              />
            ) : null}
            {item?.cloud_compliance_count ? (
              <CountCard
                count={item.cloud_compliance_count}
                nodeType={nodeType}
                scanType={ScanTypeEnum.CloudComplianceScan}
                scanId={item.latest_cloud_compliance_scan_id}
                cloudId={cloudId}
                nodeId={item.node_id}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

const CountCard = ({
  count,
  nodeType,
  scanId,
  scanType,
  cloudId,
  nodeId,
}: {
  count: number;
  scanId?: string;
  nodeType: string;
  scanType: ScanTypeEnum;
  cloudId: string;
  nodeId: string;
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
          to={getScanLink({ nodeType, scanType, scanId, cloudId, nodeId })}
          target="_blank"
          unstyled
          className={className}
        >
          {children}
        </DFLink>
      );
    }
    return <div className={className}>{children}</div>;
  };
  return (
    <Wrapper className="w-full h-full flex-1 max-w-[112px] flex flex-col gap-1.5 dark:bg-bg-card bg-df-gray-100  rounded-[5px] p-1.5">
      <div className="flex gap-1.5 items-center text-status-error">
        <div className="w-[30px] h-[30px] shrink-0">
          <Logo />
        </div>
        <div className="text-h1">{abbreviateNumber(count)}</div>
      </div>
      <div className="text-p1a text-text-text-and-icon">{label}</div>
    </Wrapper>
  );
};
