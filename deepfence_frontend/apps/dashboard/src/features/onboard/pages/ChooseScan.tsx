import { IconContext } from 'react-icons';
import { HiArrowRight, HiSwitchHorizontal } from 'react-icons/hi';
import { generatePath, Navigate, useLocation } from 'react-router-dom';
import { Button, Card, Separator, Tooltip, Typography } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoAzureRegistry from '@/assets/logo-azure-registry.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
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
  scanTitle: 'Compliance Scan',
  scanType: ScanTypeEnum.ComplianceScan,
  description: `Compliance scan measures the level of compliance, and presents the overall compliance picture as a 'Threat Graph'. This will show how the platforms are exposed, the routes that an attacker may take to exploit the exposure.`,
  buttonText: 'Configure Compliance Scan',
};

const cloudComplianceScanData = {
  scanTitle: 'Compliance Scan',
  scanType: ScanTypeEnum.CloudComplianceScan,
  description: `Compliance scan measures the level of compliance, and presents the overall compliance picture as a 'Threat Graph'. This will show how the platforms are exposed, the routes that an attacker may take to exploit the exposure.`,
  buttonText: 'Configure Compliance Scan',
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
    logo: string;
  }
> => {
  return {
    aws:
      mode === 'dark'
        ? {
            title: `Amazon Web Service Account${count > 1 ? 's' : ''}`,
            logo: LogoAwsWhite,
          }
        : {
            title: `Amazon Web Service Account${count > 1 ? 's' : ''}`,
            logo: LogoAws,
          },
    gcp: {
      title: `Google Cloud Service Account${count > 1 ? 's' : ''}`,
      logo: LogoGoogle,
    },
    azure: {
      title: `Azure Web Service Account${count > 1 ? 's' : ''}`,
      logo: LogoAzure,
    },
    host: {
      title: `Linux Host${count > 1 ? 's' : ''}`,
      logo: LogoLinux,
    },
    kubernetes_cluster: {
      title: `Kubernetes Service${count > 1 ? 's' : ''}`,
      logo: LogoK8,
    },
    registry: {
      title: `Registr${count > 1 ? 'ies' : 'y'}`,
      logo: LogoAzureRegistry,
    },
  };
};

const SelectedAccount = ({ state }: { state: OnboardConnectionNode[] }) => {
  const { mode } = useTheme();
  const { navigate } = usePageNavigation();

  const nodeType = state[0].urlType;

  return (
    <div className="flex w-fit p-3 pt-0 items-center mb-8">
      <span className="mr-6">
        <img src={logoAndTextMap(state.length, mode)[nodeType].logo} alt="logo" />
      </span>
      <div className="flex flex-col mr-20">
        <span
          className={`${Typography.size.lg} ${Typography.weight.medium} text-gray-700 dark:text-gray-100`}
        >
          {logoAndTextMap(state.length, mode)[nodeType].title}
        </span>
        <span
          className={`${Typography.size.base} ${Typography.weight.medium} text-gray-500 dark:text-gray-400`}
        >
          <Tooltip content={state[0].accountId ?? ''} triggerAsChild>
            <span>{getNodeDisplayText(state[0].accountId ?? '')}</span>
          </Tooltip>
          &nbsp;
          {state.length > 1 && (
            <Tooltip
              content={
                <ul>
                  {state.map((node, index) => {
                    return (
                      <li key={node.accountId}>
                        <span className="text-gray-400 py-2 pr-1 font-semibold">
                          {index + 1}.
                        </span>
                        <span className="text-gray-300">{node.accountId}</span>
                      </li>
                    );
                  })}
                </ul>
              }
              triggerAsChild
            >
              <span className={'text-sm text-gray-600 dark:text-gray-300'}>
                +{state.length - 1} more
              </span>
            </Tooltip>
          )}
        </span>
      </div>
      <div>
        <Button
          className="ml-auto bg-gray-100 px-2 py-1"
          size="sm"
          startIcon={<HiSwitchHorizontal />}
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
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
      {possibleScanMap[state[0].urlType].map(
        ({ scanTitle, scanType, description, buttonText }: ScanTypeListProps) => {
          return (
            <Card key={scanType} className="py-3 px-4">
              <h2
                className={`flex items-center gap-x-2 ${Typography.size.lg} ${Typography.weight.medium} text-gray-700 dark:text-gray-100 pb-2`}
              >
                <IconContext.Provider
                  value={{ className: 'w-8 h-8 text-blue-600 dark:text-blue-500' }}
                >
                  {scanType === ScanTypeEnum.VulnerabilityScan && (
                    <div className="w-5 h-5 text-blue-600 dark:text-blue-500">
                      <VulnerabilityIcon />
                    </div>
                  )}
                  {scanType === ScanTypeEnum.ComplianceScan && (
                    <div className="w-5 h-5 text-blue-600 dark:text-blue-500">
                      <PostureIcon />
                    </div>
                  )}
                  {scanType === ScanTypeEnum.SecretScan && (
                    <div className="w-5 h-5 text-blue-600 dark:text-blue-500">
                      <SecretsIcon />
                    </div>
                  )}
                  {scanType === ScanTypeEnum.MalwareScan && (
                    <div className="w-5 h-5 text-blue-600 dark:text-blue-500">
                      <MalwareIcon />
                    </div>
                  )}
                </IconContext.Provider>
                {scanTitle}
              </h2>
              <Separator />
              <p className="text-sm font-normal py-2 text-gray-500 dark:text-gray-400 min-h-[160px]">
                {description}
              </p>
              <Button
                size="xs"
                color="primary"
                className="mt-2 w-full"
                endIcon={<HiArrowRight />}
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
      <Button onClick={goBack} color="default" size="xs" className="mt-12" type="button">
        Go Back
      </Button>
    </>
  );
};

export const module = {
  element: <ChooseScan />,
};
