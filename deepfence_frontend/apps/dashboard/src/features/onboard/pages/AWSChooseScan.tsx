import { Button, Card, Separator, Typography } from 'ui-components';

import LogoAws from '../../../assets/logo-aws.svg';
import LogoAwsWhite from '../../../assets/logo-aws-white.svg';
import { useTheme } from '../../../theme/ThemeContext';
import { usePageNavigation } from '../../../utils/usePageNavigation';

type ScanTypeListProps = {
  scanType: string;
  description: string;
  lastScaned: string;
  buttonText: string;
  redirect: string;
};

const scanTypeList: ScanTypeListProps[] = [
  {
    scanType: 'Vulnerability Scan',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Compliance Scan',
    redirect: '/onboard/scan-infrastructure/cloud/aws/configure',
  },
  {
    scanType: 'Compliance Scan',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Compliance Scan',
    redirect: '/onboard/scan-infrastructure/cloud/aws/configure',
  },
  {
    scanType: 'Secrets Scan',
    description: `A few words about the compliance scan and why you need to use it.`,
    lastScaned: '3:00pm on 11/22/2022',
    buttonText: 'Configure Compliance Scan',
    redirect: 'cloud/aws/configure',
  },
];

const SelectedAccountCard = () => {
  const { mode } = useTheme();
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
        <Button className="ml-auto" color="primary" size="xs" outline>
          Swith connector
        </Button>
      </div>
    </div>
  );
};

const ScanList = () => {
  const { navigate } = usePageNavigation();
  const goNext = (path: string) => {
    navigate(path);
  };
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
      {scanTypeList.map(
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
                  goNext(redirect);
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
export const AWSChooseScan = () => {
  const { goBack } = usePageNavigation();
  return (
    <>
      <SelectedAccountCard />
      <ScanList />
      <Button onClick={goBack} outline size="xs" className="mt-16">
        Cancel
      </Button>
    </>
  );
};
