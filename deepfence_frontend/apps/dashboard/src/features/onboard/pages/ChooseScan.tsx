import { HiSwitchHorizontal } from 'react-icons/hi';
import { Button, Card, Separator, Typography } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { useTheme } from '@/theme/ThemeContext';
import { usePageNavigation } from '@/utils/usePageNavigation';

type ScanTypeListProps = {
  scanType: string;
  description: string;
  lastScaned: string;
  buttonText: string;
  redirect: string;
};

const scanTypes: ScanTypeListProps[] = [
  {
    scanType: 'Vulnerability Scan',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Vulnerability Scan',
    redirect: '/vulnerability',
  },
  {
    scanType: 'Compliance Scan',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Compliance Scan',
    redirect: '/compliance',
  },
  {
    scanType: 'Secrets Scan',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Secret Scan',
    redirect: '/secret',
  },
];

const SelectedAccount = () => {
  const { mode } = useTheme();
  const { navigate } = usePageNavigation();
  return (
    <div className="flex w-fit p-3 pt-0 items-center mb-8">
      <span className="mr-6">
        <img src={mode === 'dark' ? LogoAwsWhite : LogoAws} alt="logo" />
      </span>
      <div className="flex flex-col mr-20">
        <span
          className={`${Typography.size.lg} ${Typography.weight.medium} text-gray-700 dark:text-gray-100`}
        >
          Amazon Web Services (AWS)
        </span>
        <span
          className={`${Typography.size.base} ${Typography.weight.medium} text-gray-500 dark:text-gray-400`}
        >
          Account Id: 22222
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
  const goNext = (path: string) => {
    navigate(path);
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
      {scanTypes.map(
        ({
          scanType,
          description,
          lastScaned,
          buttonText,
          redirect,
        }: ScanTypeListProps) => {
          return (
            <Card key={scanType} className="p-5">
              <h2
                className={`${Typography.size.lg} ${Typography.weight.medium} text-gray-700 dark:text-gray-100 pb-2`}
              >
                {scanType}
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
                  goNext(`../configure${redirect}`);
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
export const ChooseScan = () => {
  const { goBack } = usePageNavigation();
  return (
    <>
      <ConnectorHeader
        title="Choose your scan type"
        description="Choose from the below options to perform your first scan."
      />
      <SelectedAccount />
      <ScanType />
      <Button onClick={goBack} outline size="xs" className="mt-16">
        Go Back
      </Button>
    </>
  );
};
