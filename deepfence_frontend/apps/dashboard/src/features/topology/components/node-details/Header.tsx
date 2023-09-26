import { Button, Dropdown, DropdownItem, SlidingModalHeader } from 'ui-components';

import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import { ScanTypeEnum } from '@/types/common';

const AvailableScansForNodeType: Record<string, ScanTypeEnum[]> = {
  host: [
    ScanTypeEnum.VulnerabilityScan,
    ScanTypeEnum.SecretScan,
    ScanTypeEnum.MalwareScan,
    ScanTypeEnum.ComplianceScan,
  ],
  container: [
    ScanTypeEnum.VulnerabilityScan,
    ScanTypeEnum.SecretScan,
    ScanTypeEnum.MalwareScan,
  ],
  container_image: [
    ScanTypeEnum.VulnerabilityScan,
    ScanTypeEnum.SecretScan,
    ScanTypeEnum.MalwareScan,
  ],
  pod: [
    ScanTypeEnum.VulnerabilityScan,
    ScanTypeEnum.SecretScan,
    ScanTypeEnum.MalwareScan,
  ],
};

export const Header = ({
  nodeId,
  nodeType,
  label,
  onGoBack,
  showBackBtn,
  onStartScanClick,
  agentRunning,
}: {
  nodeId: string;
  nodeType: string;
  label?: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  agentRunning?: boolean;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
}) => {
  const availableScans = AvailableScansForNodeType[nodeType] ?? [];

  // don't show the start scan button if host or cluster node is not connected
  // via agent. This means that it is discovered via cloud connector.
  const showInstallButton =
    ['host', 'cluster'].includes(nodeType) && agentRunning === false;
  return (
    <SlidingModalHeader>
      <div className="flex pt-5 pl-5 pr-16 pb-1.5 dark:bg-bg-breadcrumb-bar gap-4">
        <div className="flex gap-2 text-h3 dark:text-text-text-and-icon overflow-hidden items-center">
          {showBackBtn ? (
            <button
              className="h-5 w-5 shrink-0 -rotate-90 dark:text-accent-accent "
              onClick={() => {
                onGoBack();
              }}
            >
              <ArrowLine />
            </button>
          ) : null}
          <div className="w-6 h-6 shrink-0">
            <img src={getNodeImage(nodeType)} alt={nodeType} width="100%" height="100%" />
          </div>
          <div className="overflow-hidden">
            <TruncatedText text={label?.length ? label : nodeId} />
          </div>
        </div>
        {availableScans.length && !showInstallButton ? (
          <Dropdown
            align="end"
            triggerAsChild
            content={
              <>
                {availableScans.includes(ScanTypeEnum.VulnerabilityScan) ? (
                  <DropdownItem
                    onClick={(e) => {
                      e.preventDefault();
                      onStartScanClick({
                        data: {
                          nodes: [nodeId].map((nodeId) => ({
                            nodeId,
                            nodeType,
                          })),
                        },
                        showAdvancedOptions: true,
                        scanType: ScanTypeEnum.VulnerabilityScan,
                      } as ConfigureScanModalProps['scanOptions']);
                    }}
                    icon={<VulnerabilityIcon />}
                  >
                    Start Vulnerability Scan
                  </DropdownItem>
                ) : null}
                {availableScans.includes(ScanTypeEnum.SecretScan) ? (
                  <DropdownItem
                    onClick={(e) => {
                      e.preventDefault();
                      onStartScanClick({
                        data: {
                          nodes: [nodeId].map((nodeId) => ({
                            nodeId,
                            nodeType,
                          })),
                        },
                        scanType: ScanTypeEnum.SecretScan,
                        showAdvancedOptions: true,
                      } as ConfigureScanModalProps['scanOptions']);
                    }}
                    icon={<SecretsIcon />}
                  >
                    Start Secret Scan
                  </DropdownItem>
                ) : null}
                {availableScans.includes(ScanTypeEnum.MalwareScan) ? (
                  <DropdownItem
                    onClick={(e) => {
                      e.preventDefault();
                      onStartScanClick({
                        data: {
                          nodes: [nodeId].map((nodeId) => ({
                            nodeId,
                            nodeType,
                          })),
                        },
                        scanType: ScanTypeEnum.MalwareScan,
                        showAdvancedOptions: true,
                      } as ConfigureScanModalProps['scanOptions']);
                    }}
                    icon={<MalwareIcon />}
                  >
                    Start Malware Scan
                  </DropdownItem>
                ) : null}
                {availableScans.includes(ScanTypeEnum.ComplianceScan) ? (
                  <DropdownItem
                    onClick={(e) => {
                      e.preventDefault();
                      onStartScanClick({
                        scanType: ScanTypeEnum.ComplianceScan,
                        data: {
                          nodeIds: [nodeId],
                          nodeType,
                        },
                        showAdvancedOptions: true,
                      } as ConfigureScanModalProps['scanOptions']);
                    }}
                    icon={<PostureIcon />}
                  >
                    Start Posture Scan
                  </DropdownItem>
                ) : null}
              </>
            }
          >
            <Button size="md" className="ml-auto" endIcon={<CaretDown />}>
              Actions
            </Button>
          </Dropdown>
        ) : null}
        {/* TODO: show install agent button here once api is ready */}
      </div>
    </SlidingModalHeader>
  );
};
