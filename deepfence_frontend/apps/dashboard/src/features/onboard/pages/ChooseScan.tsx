import { generatePath, Navigate, useLocation } from 'react-router-dom';
import { Button, Card, Separator, Tooltip } from 'ui-components';

import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { CloudLine } from '@/components/icons/common/CloudLine';
import { SwitchIcon } from '@/components/icons/common/Switch';
import { HostIcon } from '@/components/icons/host';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { ScanTypeEnum } from '@/types/common';
import { usePageNavigation } from '@/utils/usePageNavigation';

const getNodeDisplayText = (text: string) => {
  const splittedText = text.split(',');
  if (splittedText.length === 1) {
    if (text.length > 28) {
      return text.substring(0, 28) + '...';
    }
    return text;
  } else {
    return text.substring(0, 20) + '...';
  }
};

type ScanTypeListProps = {
  scanTitle: string;
  scanType: string;
  description: string;
  buttonText: string;
};

const complianceScanData = {
  scanTitle: 'Posture Scan',
  scanType: ScanTypeEnum.ComplianceScan,
  description: `Posture scan measures the level of compliance, and presents the overall compliance picture as a 'Threat Graph'. This will show how the platforms are exposed, the routes that an attacker may take to exploit the exposure.`,
  buttonText: 'Configure Posture Scan',
};

const cloudComplianceScanData = {
  scanTitle: 'Posture Scan',
  scanType: ScanTypeEnum.CloudComplianceScan,
  description: `Posture scan measures the level of compliance, and presents the overall compliance picture as a 'Threat Graph'. This will show how the platforms are exposed, the routes that an attacker may take to exploit the exposure.`,
  buttonText: 'Configure Posture Scan',
};

const vulnerabilityScanData = {
  scanTitle: 'Vulnerability Scan',
  scanType: ScanTypeEnum.VulnerabilityScan,
  description: `Your infrastructure and applications depend on third-party components, and if vulnerabilities are ever found, attackers will rush to create and deliver exploits. Deepfence ThreatMapper categorizes and prioritizes vulnerabilities so you know what you need to fix first.`,
  buttonText: 'Configure Vulnerability Scan',
};
const secretScanData = {
  scanTitle: 'Secret Scan',
  scanType: ScanTypeEnum.SecretScan,
  description: `Deepfence Secret Scan can find unprotected secrets in container images or file systems. Deepfence SecretScanner helps users scan their container images or local directories on hosts and outputs a JSON file with details of all the secrets found.`,
  buttonText: 'Configure Secret Scan',
};
const malwareScanData = {
  scanTitle: 'Malware Scan',
  scanType: ScanTypeEnum.MalwareScan,
  description: `Deepfence Malware scans container images, running Docker containers, and filesystems to find indicators of malware. It uses ruleset to identify resources that match known malware signatures, and may indicate that the container or filesystem has been compromised.`,
  buttonText: 'Configure Malware Scan',
};

type PossibleScanMapType = Record<string, ScanTypeListProps[]>;

const possibleScanMap: PossibleScanMapType = {
  aws: [cloudComplianceScanData],
  gcp: [cloudComplianceScanData],
  azure: [cloudComplianceScanData],
  aws_org: [cloudComplianceScanData],
  gcp_org: [cloudComplianceScanData],
  azure_org: [cloudComplianceScanData],
  host: [vulnerabilityScanData, complianceScanData, secretScanData, malwareScanData],
  kubernetes_cluster: [
    vulnerabilityScanData,
    complianceScanData,
    secretScanData,
    malwareScanData,
  ],
  registry: [vulnerabilityScanData, malwareScanData, secretScanData],
};

const logoAndTextMap = (
  count: number,
  mode: Mode,
): Record<
  string,
  {
    title: string;
    logo: React.ReactNode;
  }
> => {
  return {
    aws: {
      title: `Amazon Web Service Account${count > 1 ? 's' : ''}`,
      logo: <CloudLine />,
    },
    aws_org: {
      title: `Amazon Web Service Account${count > 1 ? 's' : ''}`,
      logo: <CloudLine />,
    },
    gcp: {
      title: `Google Cloud Service Account${count > 1 ? 's' : ''}`,
      logo: <CloudLine />,
    },
    gcp_org: {
      title: `Google Cloud Service Account${count > 1 ? 's' : ''}`,
      logo: <CloudLine />,
    },
    azure: {
      title: `Azure Web Service Account${count > 1 ? 's' : ''}`,
      logo: <CloudLine />,
    },
    azure_org: {
      title: `Azure Web Service Account${count > 1 ? 's' : ''}`,
      logo: <CloudLine />,
    },
    host: {
      title: `Linux Host${count > 1 ? 's' : ''}`,
      logo: <HostIcon />,
    },
    kubernetes_cluster: {
      title: `Kubernetes Service${count > 1 ? 's' : ''}`,
      logo: <HostIcon />,
    },
    registry: {
      title: `Registr${count > 1 ? 'ies' : 'y'}`,
      logo: <RegistryIcon />,
    },
  };
};

const SelectedAccount = ({ state }: { state: OnboardConnectionNode[] }) => {
  const { mode } = useTheme();
  const { navigate } = usePageNavigation();

  const nodeType = state[0].urlType;

  return (
    <div className="flex w-fit p-3 pt-0 items-center mb-8">
      <span className="mr-6 w-8 h-8 text-accent-accent">
        {logoAndTextMap(state.length, mode)[nodeType].logo}
      </span>
      <div className="flex flex-col mr-20">
        <span className="text-text-input-value text-h4">
          {logoAndTextMap(state.length, mode)[nodeType].title}
        </span>
        <span>
          <Tooltip content={state[0].accountId ?? ''} triggerAsChild>
            <span className="text-p7 text-text-text-and-icon">
              {getNodeDisplayText(state[0].accountId ?? '')}
            </span>
          </Tooltip>
          &nbsp;
          {state.length > 1 && (
            <Tooltip
              content={
                <ul>
                  {state.map((node, index) => {
                    return (
                      <li key={node.accountId}>
                        <span className="text-p7 dark:text-text-input-value text-text-text-inverse py-2 pr-1">
                          {index + 1}.
                        </span>
                        <span className="text-p7 dark:text-text-input-value text-text-text-inverse">
                          {node.accountId}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              }
              triggerAsChild
            >
              <span className={'text-p7 text-text-input-value'}>
                +{state.length - 1} more
              </span>
            </Tooltip>
          )}
        </span>
      </div>
      <div>
        <Button
          variant="flat"
          className="ml-auto px-2 py-1"
          size="sm"
          startIcon={
            <span className="w-4 h-4">
              <SwitchIcon />
            </span>
          }
          onClick={() => {
            navigate('/onboard/connectors/my-connectors');
          }}
        >
          Switch connector
        </Button>
      </div>
    </div>
  );
};

const ScanHeader = ({ state }: { state: OnboardConnectionNode[] }) => {
  const { navigate } = usePageNavigation();

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
      {possibleScanMap[state[0].urlType].map(
        ({ scanTitle, scanType, description, buttonText }: ScanTypeListProps) => {
          return (
            <Card key={scanType} className="py-3 px-4 flex flex-col">
              <div>
                <h2
                  className={`flex items-center gap-x-2 text-h3 text-text-input-value pb-2`}
                >
                  {scanType === ScanTypeEnum.VulnerabilityScan && (
                    <div className="w-5 h-5 text-status-info">
                      <VulnerabilityIcon />
                    </div>
                  )}
                  {scanType === ScanTypeEnum.ComplianceScan && (
                    <div className="w-5 h-5 text-status-info">
                      <PostureIcon />
                    </div>
                  )}
                  {scanType === ScanTypeEnum.SecretScan && (
                    <div className="w-5 h-5 text-status-info">
                      <SecretsIcon />
                    </div>
                  )}
                  {scanType === ScanTypeEnum.MalwareScan && (
                    <div className="w-5 h-5 text-status-info">
                      <MalwareIcon />
                    </div>
                  )}
                  {scanTitle}
                </h2>
                <Separator />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <p className="text-p4 py-2 text-text-text-and-icon">{description}</p>

                <Button
                  size="md"
                  className="mt-2 w-full"
                  endIcon={
                    <span className="w-4 h-4">
                      <ArrowLine className="rotate-90" />
                    </span>
                  }
                  onClick={() => {
                    navigate(
                      generatePath('/onboard/scan/configure/:scanType', {
                        scanType,
                      }),
                      {
                        state,
                      },
                    );
                  }}
                >
                  {buttonText}
                </Button>
              </div>
            </Card>
          );
        },
      )}
    </div>
  );
};

const ChooseScan = () => {
  const { goBack } = usePageNavigation();
  const location = useLocation();

  if (!Array.isArray(location.state) || !location.state.length) {
    return <Navigate to="/onboard/connectors/my-connectors" />;
  }

  const state = location.state as unknown as OnboardConnectionNode[];

  return (
    <>
      <ConnectorHeader
        title="Choose your scan type"
        description="Choose from the below options to perform your first scan."
      />
      <SelectedAccount state={state} />
      <ScanHeader state={state} />
      <div className="mt-8 flex items-center sticky bottom-0 py-4 bg-bg-page gap-x-4">
        <Button
          onClick={goBack}
          color="default"
          type="button"
          variant="outline"
          size="md"
        >
          cancel
        </Button>
      </div>
    </>
  );
};

export const module = {
  element: <ChooseScan />,
};
