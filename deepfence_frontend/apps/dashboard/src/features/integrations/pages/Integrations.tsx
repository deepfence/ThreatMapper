import { Suspense } from 'react';
import { IconContext } from 'react-icons';
import {
  FaAws,
  FaBook,
  FaBullhorn,
  FaCopyright,
  FaFire,
  FaGoogle,
  FaInstalod,
  FaMagento,
  FaMicrosoft,
  FaMixer,
  FaReact,
  FaSearchengin,
  FaSlack,
} from 'react-icons/fa';
import { HiArrowSmRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { DFAwait } from '@/utils/suspense';

import { loader } from './IntegrationAdd';

const IntegrationsData = [
  {
    name: 'Notification',
    icon: (
      <>
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
          <IconContext.Provider
            value={{
              className: 'text-gray-600 dark:text-gray-200',
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
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-red-400',
            }}
          >
            <FaSlack />
          </IconContext.Provider>
        ),
        path: '/integrations/notifications/add/slack',
      },
      {
        name: 'Microsoft Teams',
        id: 'microsoft_teams',
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-blue-400',
            }}
          >
            <FaMicrosoft />
          </IconContext.Provider>
        ),
        path: '/integrations/notifications/add/teams',
      },
      {
        name: 'Pager Duty',
        id: 'pager_duty',
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-green-400',
            }}
          >
            <FaMagento />
          </IconContext.Provider>
        ),
        path: '/integrations/notifications/add/pagerduty',
      },
      {
        name: 'HTTP Endpoint',
        id: 'http_endpoint',
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-blue-400',
            }}
          >
            <FaMixer />
          </IconContext.Provider>
        ),
        path: '/integrations/notifications/add/http_endpoint',
      },
    ],
  },
  {
    name: 'SEIM',
    icon: (
      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
        <IconContext.Provider
          value={{
            className: 'text-gray-600 dark:text-gray-200',
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
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-green-400',
            }}
          >
            <FaReact />
          </IconContext.Provider>
        ),
        path: '/integrations/seim/add/splunk',
      },
      {
        name: 'Elasticsearch',
        id: 'elasticsearch',
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-blue-400',
            }}
          >
            <FaSearchengin />
          </IconContext.Provider>
        ),
        path: '/integrations/seim/add/elasticsearch',
      },
      {
        name: 'Sumo Logic',
        id: 'sumo_logic',
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-green-400',
            }}
          >
            <FaInstalod />
          </IconContext.Provider>
        ),
        path: '/integrations/seim/add/sumo-logic',
      },
      {
        name: 'Google Chronicle',
        id: 'google_chronicle',
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-blue-400',
            }}
          >
            <FaGoogle />
          </IconContext.Provider>
        ),
        path: '/integrations/seim/add/googlechronicle',
      },
      {
        name: 'AWS Security Hub',
        id: 'aws_security_hub',
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-yellow-400',
            }}
          >
            <FaAws />
          </IconContext.Provider>
        ),
        path: '/integrations/seim/add/aws_security_hub',
      },
    ],
  },
  {
    name: 'Ticketing',
    icon: (
      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
        <IconContext.Provider
          value={{
            className: 'text-gray-600 dark:text-gray-200',
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
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-blue-400',
            }}
          >
            <FaCopyright />
          </IconContext.Provider>
        ),
        path: '/integrations/ticketing/add/jira',
      },
    ],
  },
  {
    name: 'Archival',
    icon: (
      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
        <IconContext.Provider
          value={{
            className: 'text-gray-600 dark:text-gray-200',
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
        icon: (
          <IconContext.Provider
            value={{
              className: 'w-10 h-10 text-yellow-400',
            }}
          >
            <FaAws />
          </IconContext.Provider>
        ),
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
      <div className="flex p-2 pl-2 w-full shadow bg-white dark:bg-gray-800">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          INTEGRATIONS
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
                  {integration.name.toUpperCase()}
                </h2>
              </div>
              <div className="pl-2 flex flex-wrap gap-4">
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
                            fallback={<div className="h-6 w-6 bg-slate-200"></div>}
                          >
                            <DFAwait resolve={loaderData?.data}>
                              {(resolvedData: { data?: ModelIntegrationListResp[] }) => {
                                const { data = [] } = resolvedData ?? {};
                                const len = data.filter(
                                  (integration) =>
                                    integration.integration_type === type.id,
                                ).length;

                                return (
                                  <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                                    {len}
                                  </span>
                                );
                              }}
                            </DFAwait>
                          </Suspense>

                          <span className="text-xs text-gray-400 dark:text-gray-500">
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
