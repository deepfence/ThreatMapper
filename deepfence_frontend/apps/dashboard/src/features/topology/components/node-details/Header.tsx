import { FaPlay } from 'react-icons/fa';
import { HiArrowLeft } from 'react-icons/hi';
import {
  Button,
  Dropdown,
  DropdownItem,
  IconButton,
  SlidingModalHeader,
} from 'ui-components';

import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
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
};

export const Header = ({
  nodeId,
  nodeType,
  label,
  onGoBack,
  showBackBtn,
  onStartScanClick,
}: {
  nodeId: string;
  nodeType: string;
  label?: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
}) => {
  const availableScans = AvailableScansForNodeType[nodeType] ?? [];
  return (
    <SlidingModalHeader>
      <div className="flex items-center justify-between pr-8">
        <div className="flex gap-2 items-center flex-1 max-w-full">
          {showBackBtn && (
            <div>
              <IconButton onClick={onGoBack} size="xs" icon={<HiArrowLeft />} />
            </div>
          )}
          <div className="w-6 h-6">
            <img src={getNodeImage(nodeType)} alt={nodeType} width="100%" height="100%" />
          </div>
          <div className="truncate flex-1">
            <TruncatedText text={label?.length ? label : nodeId} />
          </div>
          {availableScans.length ? (
            <Dropdown
              align="end"
              content={
                <>
                  {availableScans.includes(ScanTypeEnum.VulnerabilityScan) ? (
                    <DropdownItem
                      onClick={(e) => {
                        e.preventDefault();
                        onStartScanClick({
                          data: {
                            nodeIds: [nodeId],
                            nodeType: nodeType as any, // TODO
                          },
                          showAdvancedOptions: false,
                          scanType: ScanTypeEnum.VulnerabilityScan,
                        });
                      }}
                    >
                      <span className="h-6 w-6">
                        <VulnerabilityIcon />
                      </span>
                      <span>Start Vulnerability Scan</span>
                    </DropdownItem>
                  ) : null}
                  {availableScans.includes(ScanTypeEnum.SecretScan) ? (
                    <DropdownItem
                      onClick={(e) => {
                        e.preventDefault();
                        onStartScanClick({
                          data: {
                            nodeIds: [nodeId],
                            nodeType: nodeType as any, // TODO
                          },
                          scanType: ScanTypeEnum.SecretScan,
                          showAdvancedOptions: false,
                        });
                      }}
                    >
                      <span className="h-6 w-6">
                        <SecretsIcon />
                      </span>
                      <span>Start Secret Scan</span>
                    </DropdownItem>
                  ) : null}
                  {availableScans.includes(ScanTypeEnum.MalwareScan) ? (
                    <DropdownItem
                      onClick={(e) => {
                        e.preventDefault();
                        onStartScanClick({
                          data: {
                            nodeIds: [nodeId],
                            nodeType: nodeType as any,
                          },
                          scanType: ScanTypeEnum.MalwareScan,
                          showAdvancedOptions: false,
                        });
                      }}
                    >
                      <span className="h-6 w-6">
                        <MalwareIcon />
                      </span>
                      <span>Start Malware Scan</span>
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
                            nodeType: nodeType as any,
                          },
                          showAdvancedOptions: true,
                        });
                      }}
                    >
                      <span className="h-6 w-6">
                        <PostureIcon />
                      </span>
                      <span>Start Compliance Scan</span>
                    </DropdownItem>
                  ) : null}
                </>
              }
            >
              <Button
                color="primary"
                size="xs"
                startIcon={<FaPlay />}
                className="self-end"
              >
                Scan
              </Button>
            </Dropdown>
          ) : null}
        </div>
      </div>
    </SlidingModalHeader>
  );
};
