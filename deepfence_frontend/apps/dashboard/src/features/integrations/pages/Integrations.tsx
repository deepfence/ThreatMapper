import { Suspense } from 'react';
import { IconContext } from 'react-icons';
import { FaBook, FaBullhorn, FaCopyright, FaFire, FaMagento } from 'react-icons/fa';
import { HiArrowSmRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
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
import { DFAwait } from '@/utils/suspense';

import { loader } from './IntegrationAdd';

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
        name: 'Slack',
        id: 'slack',
        icon: <img src={Slack} alt="Slack Logo" />,
        path: '/integrations/notifications/add/slack',
      },
      {
        name: 'Microsoft Teams',
        id: 'microsoft_teams',
        icon: <img src={MicrosoftTeams} alt="MicrosoftTeams Logo" />,
        path: '/integrations/notifications/add/teams',
      },
      {
        name: 'Pager Duty',
        id: 'pager_duty',
        icon: <img src={PagerDuty} alt="PagerDuty Logo" />,
        path: '/integrations/notifications/add/pagerduty',
      },
      {
        name: 'HTTP Endpoint',
        id: 'http_endpoint',
        icon: <img src={HttpEndpoint} alt="HttpEndpoint Logo" />,
        path: '/integrations/notifications/add/http_endpoint',
      },
    ],
  },
  {
    name: 'Seim',
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
        name: 'Splunk',
        id: 'splunk',
        icon: <img src={Splunk} alt="Splunk Logo" />,
        path: '/integrations/seim/add/splunk',
      },
      {
        name: 'Elasticsearch',
        id: 'elasticsearch',
        icon: <img src={ElasticSearch} alt="ElasticSearch Logo" />,
        path: '/integrations/seim/add/elasticsearch',
      },
      {
        name: 'Sumo Logic',
        id: 'sumo_logic',
        icon: <img src={SumoLogic} alt="SumoLogic Logo" />,
        path: '/integrations/seim/add/sumo-logic',
      },
      {
        name: 'Google Chronicle',
        id: 'google_chronicle',
        icon: <img src={GoogleChronicle} alt="GoogleChronicle Logo" />,
        path: '/integrations/seim/add/googlechronicle',
      },
      {
        name: 'AWS Security Hub',
        id: 'aws_security_hub',
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
        name: 'Jira',
        id: 'jira',
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
        name: 'S3',
        id: 's3',
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
  return (
    <>
      <div className="flex p-2 w-full shadow bg-white dark:bg-gray-800 items-center">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200">
          Integrations
        </span>
        <DFLink className="ml-auto uppercase text-xs" to="/integrations/download/report">
          Report Download
        </DFLink>
      </div>
      <div className="flex flex-col space-y-8 my-2">
        {IntegrationsData.map((integration) => {
          return (
            <section key={integration.name} className="flex flex-col">
              <div className="flex items-center pl-2 mb-2 text-gray-700">
                <IconContext.Provider
                  value={{
                    className: 'w-4 h-4 text-gray-700',
                  }}
                >
                  {integration.icon}
                </IconContext.Provider>
                <h2 className="px-4 tracking-wider text-gary-900 dark:text-gray-200 font-semibold">
                  {integration.name}
                </h2>
              </div>
              <div className="pl-2 flex flex-wrap gap-2">
                {integration?.types?.map((type) => {
                  return (
                    <Card key={type.name} className="p-4 flex flex-col shrink-0 gap-y-1">
                      <div className="flex items-center justify-between w-full">
                        <h4 className="text-gray-900 text-md dark:text-white mr-4">
                          {type.name}
                        </h4>
                        <div className="ml-auto">
                          <DFLink
                            to={type.path ?? '#'}
                            className="flex items-center hover:no-underline"
                          >
                            <span className="text-xs text-blue-600 dark:text-blue-500">
                              Configure
                            </span>
                            <IconContext.Provider
                              value={{
                                className: 'text-blue-600 dark:text-blue-500 ',
                              }}
                            >
                              <HiArrowSmRight />
                            </IconContext.Provider>
                          </DFLink>
                        </div>
                      </div>
                      <div className="flex items-center gap-x-6">
                        <div className="p-4 flex border-r border-gray-200 dark:border-gray-700 w-20 h-20">
                          {type.icon}
                        </div>
                        <div className="flex flex-col gap-x-4">
                          <Suspense
                            fallback={
                              <div className="h-6 w-4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                            }
                          >
                            <DFAwait resolve={loaderData?.data}>
                              {(resolvedData: { data?: ModelIntegrationListResp[] }) => {
                                const { data = [] } = resolvedData ?? {};
                                const len = data.filter(
                                  (integration) =>
                                    integration.integration_type === type.id,
                                ).length;

                                return (
                                  <span className="text-[1.875rem] text-gray-900 dark:text-gray-200 font-light">
                                    {len}
                                  </span>
                                );
                              }}
                            </DFAwait>
                          </Suspense>

                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Connections
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
};

export const module = {
  element: <Integrations />,
  loader,
};
