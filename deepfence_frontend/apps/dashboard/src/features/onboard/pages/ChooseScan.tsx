import { HiSwitchHorizontal } from 'react-icons/hi';
import {
  generatePath,
  LoaderFunctionArgs,
  redirect,
  useLoaderData,
} from 'react-router-dom';
import { Button, Card, Separator, Tooltip, Typography } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoAzureRegistry from '@/assets/logo-azure-registry.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { usePageNavigation } from '@/utils/usePageNavigation';

type NodeType = 'aws' | 'gcp' | 'azure' | 'host' | 'kubernetes' | 'registry';

type LoaderDataType = {
  nodeType: NodeType;
  nodeIds: string;
};

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

const loader = ({ params }: LoaderFunctionArgs): LoaderDataType => {
  // TODO: validate node type from url
  if (
    !params.nodeType ||
    !params.nodeType.trim().length ||
    !params.nodeIds ||
    !params.nodeIds.trim().length
  ) {
    throw redirect('/onboard/connectors/my-connectors');
  }
  return {
    nodeType: params.nodeType as NodeType,
    nodeIds: params.nodeIds,
  };
};

type ScanTypeListProps = {
  scanTitle: string;
  scanType: string;
  description: string;
  lastScaned: string;
  buttonText: string;
};

const awsScanType = [
  {
    scanTitle: 'Compliance Scan',
    scanType: 'compliance',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Compliance Scan',
  },
];
const scanTypes: ScanTypeListProps[] = [
  {
    scanTitle: 'Vulnerability Scan',
    scanType: 'vulnerability',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Vulnerability Scan',
  },
  awsScanType[0],
  {
    scanTitle: 'Secrets Scan',
    scanType: 'secret',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Secret Scan',
  },
];
type R = Record<NodeType, ScanTypeListProps[]>;

const possibleScanMap: R = {
  aws: awsScanType,
  gcp: awsScanType,
  azure: awsScanType,
  host: scanTypes,
  kubernetes: scanTypes,
  registry: scanTypes,
};

const logoAndTextMap = (
  mode: Mode,
): Record<
  NodeType,
  {
    title: string;
    logo: string;
  }
> => {
  return {
    aws:
      mode === 'dark'
        ? {
            title: 'Amazon Web Services',
            logo: LogoAwsWhite,
          }
        : {
            title: 'Amazon Web Services',
            logo: LogoAws,
          },
    gcp: {
      title: 'Google Cloud Services',
      logo: LogoGoogle,
    },
    azure: {
      title: 'Azure Web Services',
      logo: LogoAzure,
    },
    host: {
      title: 'A Linux Host',
      logo: LogoLinux,
    },
    kubernetes: {
      title: 'A Kubernetes Service',
      logo: LogoK8,
    },
    registry: {
      title: 'A registry',
      logo: LogoAzureRegistry,
    },
  };
};

const SelectedAccount = () => {
  const { mode } = useTheme();
  const { navigate } = usePageNavigation();
  const { nodeIds = '', nodeType } = useLoaderData() as LoaderDataType;

  return (
    <div className="flex w-fit p-3 pt-0 items-center mb-8">
      <span className="mr-6">
        <img src={logoAndTextMap(mode)[nodeType].logo} alt="logo" />
      </span>
      <div className="flex flex-col mr-20">
        <span
          className={`${Typography.size.lg} ${Typography.weight.medium} text-gray-700 dark:text-gray-100`}
        >
          {logoAndTextMap(mode)[nodeType].title}
        </span>
        <span
          className={`${Typography.size.base} ${Typography.weight.medium} text-gray-500 dark:text-gray-400`}
        >
          <Tooltip content={nodeIds.split(',')[0]}>
            <span>{getNodeDisplayText(nodeIds)}</span>
          </Tooltip>
          &nbsp;
          {nodeIds.split(',').length > 1 && (
            <Tooltip content={nodeIds.split(',').slice(1).join(', ')}>
              <span className={`${Typography.size.sm} text-blue-500 dark:text-blue-400`}>
                +{nodeIds.split(',').length - 1} more
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

const ScanType = () => {
  const { navigate } = usePageNavigation();
  const { nodeIds = '', nodeType } = useLoaderData() as LoaderDataType;

  const goNext = (path: string) => {
    navigate(path);
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
      {possibleScanMap[nodeType].map(
        ({
          scanTitle,
          scanType,
          description,
          lastScaned,
          buttonText,
        }: ScanTypeListProps) => {
          return (
            <Card key={scanType} className="p-5">
              <h2
                className={`${Typography.size.lg} ${Typography.weight.medium} text-gray-700 dark:text-gray-100 pb-2`}
              >
                {scanTitle}
              </h2>
              <Separator />
              <p className={`${Typography.size.sm} ${Typography.weight.normal} py-2`}>
                {description}
              </p>
              <div
                className={`mb-4 text-gray-500 dark:text-gray-400 ${Typography.size.sm} ${Typography.weight.normal}`}
              >
                Last scan:&nbsp;{lastScaned}
              </div>
              <Button
                size="xs"
                color="primary"
                onClick={() => {
                  goNext(
                    generatePath(
                      `/onboard/scan/configure/${scanType}/:nodeType/:nodeIds`,
                      {
                        nodeType,
                        nodeIds,
                      },
                    ),
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
  return (
    <>
      <ConnectorHeader
        title="Choose your scan type"
        description="Choose from the below options to perform your first scan."
      />
      <SelectedAccount />
      <ScanType />
      <Button onClick={goBack} color="default" size="xs" className="mt-16">
        Go Back
      </Button>
    </>
  );
};

export const module = {
  loader,
  element: <ChooseScan />,
};
