import { Suspense, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaBook, FaBullhorn, FaCopyright, FaFire } from 'react-icons/fa';
import { HiDownload, HiOutlineChevronRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LinkButton } from '@/components/LinkButton';
import {
  AwsSecurityHub,
  ElasticSearch,
  GoogleChronicle,
  HttpEndpoint,
  Jira,
  MicrosoftTeams,
  PagerDuty,
  S3,
  Slack,
  Splunk,
  SumoLogic,
} from '@/constants/logos';
import { IntegrationType } from '@/features/integrations/components/IntegrationForm';
import { DFAwait } from '@/utils/suspense';

import { loader } from './IntegrationAdd';

export const integrationTypeToNameMapping: { [key: string]: string } = {
  slack: 'Slack',
  teams: 'Microsoft Teams',
  pagerduty: 'Pager Duty',
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

const IntegrationsData = [
  {
    name: 'Notification',
    icon: (
      <>
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
          <IconContext.Provider
            value={{
              className: 'text-blue-600 dark:text-blue-400',
            }}
          >
            <FaBullhorn />
          </IconContext.Provider>
        </div>
      </>
    ),
    types: [
      {
        name: integrationTypeToNameMapping[IntegrationType.slack],
        id: IntegrationType.slack,
        icon: <img src={Slack} alt="Slack Logo" />,
        path: '/integrations/notifications/add/slack',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.microsoftTeams],
        id: IntegrationType.microsoftTeams,
        icon: <img src={MicrosoftTeams} alt="MicrosoftTeams Logo" />,
        path: '/integrations/notifications/add/teams',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.pagerDuty],
        id: IntegrationType.pagerDuty,
        icon: <img src={PagerDuty} alt="PagerDuty Logo" />,
        path: '/integrations/notifications/add/pagerduty',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.httpEndpoint],
        id: IntegrationType.httpEndpoint,
        icon: <img src={HttpEndpoint} alt="HttpEndpoint Logo" />,
        path: '/integrations/notifications/add/http_endpoint',
      },
    ],
  },
  {
    name: 'SIEM/SOAR',
    icon: (
      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
        <IconContext.Provider
          value={{
            className: 'text-blue-600 dark:text-blue-400',
          }}
        >
          <FaBook />
        </IconContext.Provider>
      </div>
    ),
    types: [
      {
        name: integrationTypeToNameMapping[IntegrationType.splunk],
        id: IntegrationType.splunk,
        icon: <img src={Splunk} alt="Splunk Logo" />,
        path: '/integrations/seim/add/splunk',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.elasticsearch],
        id: IntegrationType.elasticsearch,
        icon: <img src={ElasticSearch} alt="ElasticSearch Logo" />,
        path: '/integrations/seim/add/elasticsearch',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.sumoLogic],
        id: IntegrationType.sumoLogic,
        icon: <img src={SumoLogic} alt="SumoLogic Logo" />,
        path: '/integrations/seim/add/sumologic',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.googleChronicle],
        id: IntegrationType.googleChronicle,
        icon: <img src={GoogleChronicle} alt="GoogleChronicle Logo" />,
        path: '/integrations/seim/add/googlechronicle',
      },
      {
        name: integrationTypeToNameMapping[IntegrationType.awsSecurityHub],
        id: IntegrationType.awsSecurityHub,
        icon: <img src={AwsSecurityHub} alt="AwsSecurityHub Logo" />,
        path: '/integrations/seim/add/aws_security_hub',
      },
    ],
  },
  {
    name: 'Ticketing',
    icon: (
      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 flex items-center justify-center rounded-sm">
        <IconContext.Provider
          value={{
            className: 'text-blue-600 dark:text-blue-400',
          }}
        >
          <FaCopyright />
        </IconContext.Provider>
      </div>
    ),
    types: [
      {
        name: integrationTypeToNameMapping[IntegrationType.jira],
        id: IntegrationType.jira,
        icon: <img src={Jira} alt="Jira Logo" />,
        path: '/integrations/ticketing/add/jira',
      },
    ],
  },
  {
    name: 'Archival',
    icon: (
      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 flex items-center justify-center rounded-sm">
        <IconContext.Provider
          value={{
            className: 'text-blue-600 dark:text-blue-400',
          }}
        >
          <FaFire />
        </IconContext.Provider>
      </div>
    ),
    types: [
      {
        name: integrationTypeToNameMapping[IntegrationType.s3],
        id: IntegrationType.s3,
        icon: <img src={S3} alt="AWS S3 Logo" />,
        path: '/integrations/archival/add/s3',
      },
    ],
  },
];

const Integrations = () => {
  const loaderData = useLoaderData() as {
    data: ModelIntegrationListResp[];
  };

  const [error, setError] = useState<string>();

  return (
    <>
      <div className="flex p-2 w-full shadow bg-white dark:bg-gray-800 items-center">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200">
          Integrations
        </span>
      </div>
      <div className="p-2 gap-y-4 flex flex-col">
        <Card className="w-fit">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 flex items-center justify-center rounded-sm">
              <IconContext.Provider
                value={{
                  className: 'text-blue-600 dark:text-blue-400',
                }}
              >
                <HiDownload />
              </IconContext.Provider>
            </div>
            <h2 className="px-4 tracking-wider text-gary-900 dark:text-gray-200 font-semibold">
              Reports Download
            </h2>
            <div className="px-2">
              <LinkButton to="/integrations/download/report" sizing="sm">
                Generate and download PDF/Excel Reports&nbsp;
                <HiOutlineChevronRight />
              </LinkButton>
            </div>
          </div>
        </Card>
        <ErrorBoundary
          fallback={
            <div>
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          }
        >
          {IntegrationsData.map((integration) => {
            return (
              <section key={integration.name} className="flex flex-col">
                <div className="flex items-center">
                  <IconContext.Provider
                    value={{
                      className: 'w-4 h-4',
                    }}
                  >
                    {integration.icon}
                  </IconContext.Provider>
                  <h2 className="px-4 tracking-wider text-gary-900 dark:text-gray-200 font-semibold">
                    {integration.name}
                  </h2>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {integration?.types?.map((type) => {
                    return (
                      <Card key={type.name} className="p-2 flex flex-col shrink-0 pb-3">
                        <div className="flex items-center justify-between w-full">
                          <h4 className="text-gray-900 font-medium text-sm dark:text-white mr-4">
                            {type.name}
                          </h4>
                          <div className="flex ml-auto">
                            <LinkButton to={type.path} sizing="xs">
                              <>
                                Go to details&nbsp;
                                <HiOutlineChevronRight />
                              </>
                            </LinkButton>
                          </div>
                        </div>
                        <div className="flex items-center gap-x-6 mt-2">
                          <div className="border-r border-gray-200 dark:border-gray-700">
                            <div className="px-4 flex justify-center items-center h-8 w-20 m-w-[32px] m-h-[32px]">
                              {type.icon}
                            </div>
                          </div>
                          <Suspense
                            fallback={
                              <div className="w-16">
                                <div className="h-8 w-4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                                <div className="mt-2 h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                              </div>
                            }
                          >
                            <DFAwait resolve={loaderData?.data}>
                              {(resolvedData: {
                                data?: ModelIntegrationListResp[];
                                message?: string;
                              }) => {
                                const { data = [], message } = resolvedData ?? {};

                                if (message && message.length) {
                                  setError(message);
                                  throw new Error();
                                }

                                const len = data.filter(
                                  (integration) =>
                                    integration.integration_type === type.id,
                                ).length;

                                return (
                                  <div className="flex flex-col">
                                    <span className="text-[1.875rem] text-gray-900 dark:text-gray-200 font-light">
                                      {len}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {`Connection${len > 1 ? 's' : ''}`}
                                    </span>
                                  </div>
                                );
                              }}
                            </DFAwait>
                          </Suspense>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </ErrorBoundary>
      </div>
    </>
  );
};

export const module = {
  element: <Integrations />,
  loader,
};
