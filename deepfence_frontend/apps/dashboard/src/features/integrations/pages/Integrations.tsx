import { useSuspenseQuery } from '@suspensive/react-query';
import { ReactNode, Suspense } from 'react';
import { generatePath } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  Separator,
  Tooltip,
} from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { InfoStandardIcon } from '@/components/icons/common/InfoStandard';
import { SparkleLineIcon } from '@/components/icons/common/SparkleLine';
import { BedrockIcon } from '@/components/icons/integration/Bedrock';
import { DownloadReportIcon } from '@/components/icons/integration/DownloadReport';
import { ElasticsearchIcon } from '@/components/icons/integration/Elasticsearch';
import { EmailIcon } from '@/components/icons/integration/Email';
import { GoogleChronicleIcon } from '@/components/icons/integration/GoogleChronicle';
import { HttpIcon } from '@/components/icons/integration/Http';
import { JiraIcon } from '@/components/icons/integration/Jira';
import { OpenAIIcon } from '@/components/icons/integration/OpenAI';
import { PagerDutyIcon } from '@/components/icons/integration/PagerDuty';
import { S3ArchivalIcon } from '@/components/icons/integration/S3Archival';
import { SlackIcon } from '@/components/icons/integration/Slack';
import { SplunkIcon } from '@/components/icons/integration/Splunk';
import { SumoLogicIcon } from '@/components/icons/integration/SumoLogic';
import { TeamsIcon } from '@/components/icons/integration/Teams';
import { AmazonECRRegistryIcon } from '@/components/icons/registries/AmazonEcr';
import { IntegrationsIcon } from '@/components/sideNavigation/icons/Integrations';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { IntegrationType } from '@/features/integrations/components/IntegrationForm';
import { useGetReports } from '@/features/integrations/pages/DownloadReport';
import { queries } from '@/queries';
import { GenerativeAIIntegrationType } from '@/types/common';
import { usePageNavigation } from '@/utils/usePageNavigation';

import { useListIntegrations } from './IntegrationAdd';

export const integrationTypeToNameMapping: Record<string, string> = {
  slack: 'Slack',
  teams: 'Microsoft Teams',
  pagerduty: 'PagerDuty',
  http_endpoint: 'HTTP Endpoint',
  jira: 'Jira',
  s3: 'S3',
  splunk: 'Splunk',
  elasticsearch: 'Elasticsearch',
  sumologic: 'Sumo Logic',
  googlechronicle: 'Google Chronicle',
  aws_security_hub: 'AWS Security Hub',
  email: 'Email',
};

interface Type {
  name: string;
  id: string;
  icon: JSX.Element;
  path: string;
}

interface IIntegrationType {
  name: string;
  types: Type[];
}

const IntegrationsData = [
  {
    name: 'Notification',
    types: [
      {
        name: integrationTypeToNameMapping[IntegrationType.slack],
        id: IntegrationType.slack,
        icon: <SlackIcon />,
        path: '/integrations/notifications/add/slack',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.microsoftTeams],
        id: IntegrationType.microsoftTeams,
        icon: <TeamsIcon />,
        path: '/integrations/notifications/add/teams',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.pagerDuty],
        id: IntegrationType.pagerDuty,
        icon: <PagerDutyIcon />,
        path: '/integrations/notifications/add/pagerduty',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.httpEndpoint],
        id: IntegrationType.httpEndpoint,
        icon: <HttpIcon />,
        path: '/integrations/notifications/add/http_endpoint',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.email],
        id: IntegrationType.email,
        icon: <EmailIcon />,
        path: '/integrations/notifications/add/email',
      },
    ],
  },
  {
    name: 'SIEM/SOAR',
    types: [
      {
        name: integrationTypeToNameMapping[IntegrationType.splunk],
        id: IntegrationType.splunk,
        icon: <SplunkIcon />,
        path: '/integrations/seim/add/splunk',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.elasticsearch],
        id: IntegrationType.elasticsearch,
        icon: <ElasticsearchIcon />,
        path: '/integrations/seim/add/elasticsearch',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.sumoLogic],
        id: IntegrationType.sumoLogic,
        icon: <SumoLogicIcon />,
        path: '/integrations/seim/add/sumologic',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.googleChronicle],
        id: IntegrationType.googleChronicle,
        icon: <GoogleChronicleIcon />,
        path: '/integrations/seim/add/googlechronicle',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.awsSecurityHub],
        id: IntegrationType.awsSecurityHub,
        icon: <AmazonECRRegistryIcon />,
        path: '/integrations/seim/add/aws_security_hub',
      },
    ],
  },
  {
    name: 'Ticketing',
    types: [
      {
        name: integrationTypeToNameMapping[IntegrationType.jira],
        id: IntegrationType.jira,
        icon: <JiraIcon />,
        path: '/integrations/ticketing/add/jira',
      },
    ],
  },
  {
    name: 'Archival',
    types: [
      {
        name: integrationTypeToNameMapping[IntegrationType.s3],
        id: IntegrationType.s3,
        icon: <S3ArchivalIcon />,
        path: '/integrations/archival/add/s3',
      },
    ],
  },
];

const AI_INTEGRATION_TYPES: Array<{
  type: GenerativeAIIntegrationType;
  label: string;
  icon: ReactNode;
}> = [
  {
    type: 'openai',
    label: 'OpenAI',
    icon: <OpenAIIcon />,
  },
  {
    type: 'amazon-bedrock',
    label: 'Amazon Bedrock',
    icon: <BedrockIcon />,
  },
];

const Count = ({
  type,
  data,
}: {
  type: Type;
  data: ModelIntegrationListResp[] | undefined;
}) => {
  const len = data?.filter((integration) => integration.integration_type === type.id)
    .length;
  return (
    <div className="flex items-center gap-x-2 mt-1">
      <span className="text-h2 text-text-input-value">{len}</span>
      <span className="text-p7 text-text-text-and-icon">
        {`Connection${len && len > 1 ? 's' : ''}`}
      </span>
    </div>
  );
};
const CardContent = ({
  type,
  data,
}: {
  type: Type;
  data: ModelIntegrationListResp[] | undefined;
}) => {
  return (
    <div className="flex flex-col">
      <h4 className="text-h6 text-text-input-value">{type.name}</h4>
      <Count type={type} data={data} />
    </div>
  );
};
const IntegrationTypes = ({ integration }: { integration: IIntegrationType }) => {
  const { data: list } = useListIntegrations();
  const { message, data } = list ?? {};
  if (message && message.length) {
    return <p className="text-p7 text-status-error">{message}</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-4">
      {integration?.types?.map((type) => {
        return (
          <DFLink
            to={type.path}
            unstyled
            key={type.name}
            data-testid={`${type.id}Id`}
            className="hover:shadow-[0px_0px_6px_1px_#044AFF] focus:shadow-[0px_0px_6px_1px_#044AFF] cursor-pointer rounded-[5px]"
          >
            <Card className="p-3 flex flex-col shrink-0 min-w-[208px] ring-inset dark:hover:ring-bg-hover-3 dark:hover:ring-1 dark:focus:ring-1 dark:focus:ring-bg-hover-3 hover:border-text-link focus:border-text-link">
              <div className="flex items-center gap-x-4">
                <div className="dark:bg-bg-grid-default bg-df-gray-100 rounded-full p-3 flex justify-center items-center">
                  <span className="h-9 w-9">{type.icon}</span>
                </div>
                <CardContent type={type} data={data} />
              </div>
            </Card>
          </DFLink>
        );
      })}
    </div>
  );
};
const Skeleton = ({ count }: { count: number }) => {
  return (
    <section className="flex flex-row gap-4 mt-2">
      {Array.from(Array(count).keys()).map((k) => (
        <Card key={k} className="p-3 flex flex-col shrink-0 min-w-[208px] w-fit">
          <div className="flex items-center gap-x-6">
            <div className="bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-full p-3 flex justify-center items-center">
              <span className="h-9 w-9"></span>
            </div>
            <div className="flex flex-col">
              <div className="h-3 w-16 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
              <div className="flex items-center gap-x-2 mt-4">
                <div className="h-6 w-6 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
                <div className="h-2 w-16 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
};

const Integrations = () => {
  return (
    <>
      <BreadcrumbWrapper>
        <Breadcrumb>
          <BreadcrumbLink
            icon={<IntegrationsIcon />}
            className="text-text-input-value leading-[30px]"
          >
            Integrations
          </BreadcrumbLink>
        </Breadcrumb>
      </BreadcrumbWrapper>
      <div className="m-4 gap-y-6 flex flex-col">
        <ThreatRx />
        {IntegrationsData.map((integration, index) => {
          return (
            <section key={integration.name} className="flex flex-col">
              <h2 className="text-t3 dark:text-text-input-value text-text-text-and-icon">
                {integration.name}
              </h2>
              <Suspense
                fallback={<Skeleton count={IntegrationsData[index].types.length} />}
              >
                <IntegrationTypes integration={integration} />
              </Suspense>
            </section>
          );
        })}
        <Separator className="bg-bg-grid-border h-px w-full mt-1" />
        <DownloadReport />
      </div>
    </>
  );
};

const ReportCount = () => {
  const { data } = useGetReports();
  const reportCount = data?.data?.length ?? 0;

  return (
    <div className="flex gap-x-2 items-center">
      <span className="text-h2 dark:text-text-input-value" data-testid="reportCountId">
        {reportCount}
      </span>

      <span className="text-p7">Reports generated</span>
    </div>
  );
};

const DownloadReport = () => {
  const { navigate } = usePageNavigation();

  return (
    <div>
      <h2 className="text-t3 dark:text-text-input-value text-text-text-and-icon">
        Download reports
      </h2>
      <div className="mt-2 flex gap-x-4 items-center">
        <div className="flex flex-col w-fit min-w-[208px]" data-testid="reportWrapperId">
          <DFLink
            to={'/integrations/download/report'}
            className="h-[84px] hover:shadow-[0px_0px_6px_1px_#044AFF] focus:shadow-[0px_0px_6px_1px_#044AFF] cursor-pointer rounded-[5px]"
            unstyled
          >
            <Card
              className={cn(
                'p-3 flex shrink-0 items-center h-full gap-x-4',
                'text-text-text-and-icon',
                'ring-inset dark:hover:ring-bg-hover-3 dark:hover:ring-1 dark:focus:ring-1 dark:focus:ring-bg-hover-3 hover:border-text-link focus:border-text-link',
              )}
            >
              <div className="dark:bg-bg-grid-default bg-df-gray-100 rounded-full p-3 flex justify-center items-center">
                <span className="h-9 w-9">
                  <DownloadReportIcon />
                </span>
              </div>

              <Suspense
                fallback={
                  <div className="animate-pulse flex gap-x-2 items-center">
                    <div className="bg-bg-grid-border rounded-md">
                      <div className="w-4 h-6"></div>
                    </div>
                    <div className="bg-bg-grid-border rounded-md">
                      <div className="w-16 h-2"></div>
                    </div>
                  </div>
                }
              >
                <ReportCount />
              </Suspense>
            </Card>
          </DFLink>
        </div>
        <Button
          className="self-center"
          size="md"
          type="button"
          onClick={() => {
            navigate('/integrations/download/report/create');
          }}
          startIcon={
            <span className="w-2 h-2 ">
              <DownloadReportIcon />
            </span>
          }
        >
          Create New Report
        </Button>
      </div>
    </div>
  );
};

function useListAIIntegrations() {
  return useSuspenseQuery({
    ...queries.integration.listAIIntegrations(),
  });
}

const AIIntegrations = () => {
  const {
    data: { data, message },
  } = useListAIIntegrations();

  if (message && message.length) {
    return <p className="text-p7 text-status-error">{message}</p>;
  }

  const groupedData = data.reduce<Record<string, number>>((prev, current) => {
    if (!prev[current.integration_type ?? '']) {
      prev[current.integration_type ?? ''] = 1;
    } else {
      prev[current.integration_type ?? ''] += 1;
    }
    return prev;
  }, {});

  return (
    <div className="mt-2 flex flex-wrap gap-4">
      {AI_INTEGRATION_TYPES.map((type) => {
        const count = groupedData[type.type] ?? 0;
        return (
          <DFLink
            to={generatePath('/integrations/gen-ai/:integrationType', {
              integrationType: type.type,
            })}
            unstyled
            key={type.type}
            className="hover:shadow-[0px_0px_6px_1px_#044AFF] focus:shadow-[0px_0px_6px_1px_#044AFF] cursor-pointer rounded-[5px]"
          >
            <Card
              className={cn(
                'p-3 flex flex-col shrink-0 min-w-[208px] ',
                'ring-inset dark:hover:ring-bg-hover-3 dark:hover:ring-1 dark:focus:ring-1 dark:focus:ring-bg-hover-3 hover:border-text-link focus:border-text-link',
              )}
            >
              <div className="flex items-center gap-x-6">
                <div className="dark:bg-bg-grid-default bg-df-gray-100 rounded-full p-3 flex justify-center items-center">
                  <span className="h-9 w-9">{type.icon}</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-h6 text-text-input-value">{type.label}</h4>

                  <div className="flex items-center gap-x-2 mt-1">
                    <span className="text-h2 text-text-input-value">{count}</span>
                    <span className="text-p7 text-text-text-and-icon">
                      {`Connection`}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </DFLink>
        );
      })}
    </div>
  );
};

const ThreatRx = () => {
  return (
    <section className="flex flex-col">
      <h2 className="flex items-center gap-2 text-h5 animate-text-gradient text-transparent bg-gradient-to-r dark:from-pink-400 dark:via-orange-400 dark:to-fuchsia-300 from-pink-600 via-orange-700 to-fuchsia-600 bg-clip-text">
        <div className="h-4 w-4 dark:text-orange-400 text-orange-700">
          <SparkleLineIcon />
        </div>
        ThreatRx
        <Tooltip placement="right" content="Remediations powered by Generative AI">
          <div className="h-4 w-4 text-text-text-and-icon">
            <InfoStandardIcon />
          </div>
        </Tooltip>
      </h2>
      <Suspense fallback={<Skeleton count={2} />}>
        <AIIntegrations />
      </Suspense>
    </section>
  );
};

export const module = {
  element: <Integrations />,
};
