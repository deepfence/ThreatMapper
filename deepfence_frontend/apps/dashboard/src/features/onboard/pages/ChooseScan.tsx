import { IconContext } from 'react-icons';
import { HiArrowRight, HiDocumentSearch, HiSwitchHorizontal } from 'react-icons/hi';
import { generatePath, Navigate, useLocation } from 'react-router-dom';
import { Button, Card, Separator, Tooltip, Typography } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoAzureRegistry from '@/assets/logo-azure-registry.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
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
  description: `A few words about the compliance scan and why you need to use it.`,
  buttonText: 'Configure Compliance Scan',
};

const cloudComplianceScanData = {
  scanTitle: 'Compliance Scan',
  scanType: ScanTypeEnum.CloudComplianceScan,
  description: `A few words about the compliance scan and why you need to use it.`,
  buttonText: 'Configure Compliance Scan',
};

const vulnerabilityScanData = {
  scanTitle: 'Vulnerability Scan',
  scanType: ScanTypeEnum.VulnerabilityScan,
  description: `A few words about the vulnerability scan and why you need to use it.`,
  buttonText: 'Configure Vulnerability Scan',
};
const secretScanData = {
  scanTitle: 'Secret Scan',
  scanType: ScanTypeEnum.SecretScan,
  description: `A few words about the secret scan and why you need to use it.`,
  buttonText: 'Configure Secret Scan',
};
const malwareScanData = {
  scanTitle: 'Malware Scan',
  scanType: ScanTypeEnum.MalwareScan,
  description: `A few words about the malwawre scan and why you need to use it.`,
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
            title: `(${count}) Amazon Web Service Account${count > 1 ? 's' : ''}`,
            logo: LogoAwsWhite,
          }
        : {
            title: `(${count}) Amazon Web Service Account${count > 1 ? 's' : ''}`,
            logo: LogoAws,
          },
    gcp: {
      title: `(${count}) Google Cloud Service Account${count > 1 ? 's' : ''}`,
      logo: LogoGoogle,
    },
    azure: {
      title: `(${count}) Azure Web Service Account${count > 1 ? 's' : ''}`,
      logo: LogoAzure,
    },
    host: {
      title: `(${count}) Linux Host${count > 1 ? 's' : ''}`,
      logo: LogoLinux,
    },
    kubernetes_cluster: {
      title: `(${count}) Kubernetes Service${count > 1 ? 's' : ''}`,
      logo: LogoK8,
    },
    registry: {
      title: `(${count}) Registr${count > 1 ? 'ies' : 'y'}`,
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
          <Tooltip content={state[0].accountId ?? ''}>
            <span>{getNodeDisplayText(state[0].accountId ?? '')}</span>
          </Tooltip>
          &nbsp;
          {state.length > 1 && (
            <Tooltip
              content={state
                .map((node) => node.accountId)
                .slice(1)
                .join(', ')}
            >
              <span className={`${Typography.size.sm} text-blue-500 dark:text-blue-400`}>
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
            <Card key={scanType} className="p-5">
              <h2
                className={`flex items-center gap-x-2 ${Typography.size.lg} ${Typography.weight.medium} text-gray-700 dark:text-gray-100 pb-2`}
              >
                <IconContext.Provider
                  value={{ className: 'w-8 h-8 text-blue-600 dark:text-blue-500' }}
                >
                  <HiDocumentSearch />
                </IconContext.Provider>
                {scanTitle}
              </h2>
              <Separator />
              <p className={`${Typography.size.sm} ${Typography.weight.normal} py-2`}>
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
      <Button onClick={goBack} color="default" size="xs" className="mt-16">
        Go Back
      </Button>
    </>
  );
};

export const module = {
  element: <ChooseScan />,
};
