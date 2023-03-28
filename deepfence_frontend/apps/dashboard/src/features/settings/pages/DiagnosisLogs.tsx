import { HiDocumentSearch, HiUsers } from 'react-icons/hi';
import { Button, Select, Tabs } from 'ui-components';

import { getTopologyApiClient } from '@/api/api';
import { DFLink } from '@/components/DFLink';
import { ApiError, makeRequest } from '@/utils/api';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const settingsTabs: Array<{
  label: string;
  value: 'diagnosis-logs' | 'user-management';
  icon?: React.ReactNode;
}> = [
  {
    label: 'Diagnostic Logs',
    value: 'diagnosis-logs',
    icon: <HiDocumentSearch />,
  },
  {
    label: 'User Management',
    value: 'user-management',
    icon: <HiUsers />,
  },
];

const getHosts = async () => {
  const hostsResultsPromise = await makeRequest({
    apiFunction: getTopologyApiClient().getHostsTopologyGraph,
    apiArgs: [
      {
        graphTopologyFilters: {
          cloud_filter: [],
          field_filters: {
            contains_filter: { filter_in: null },
            order_filter: null as any,
            match_filter: {
              filter_in: {},
            },
          },
          host_filter: [],
          kubernetes_filter: [],
          pod_filter: [],
          region_filter: [],
        },
      },
    ],
  });
  if (ApiError.isApiError(hostsResultsPromise)) {
    return [];
  }
};

const loader = (): Promise<any> => {
  return Promise.resolve([]);
};
const DiagnosisLogs = () => {
  const { navigate } = usePageNavigation();
  return (
    <Tabs
      tabs={settingsTabs}
      value="diagnosis-logs"
      size="sm"
      className="mt-2 px-2"
      onValueChange={(value) => {
        navigate(`/settings/${value}`);
      }}
    >
      <div className="flex flex-col mt-2 gap-y-3">
        <div className="bg-green-100 px-4 py-6 w-fit rounded-lg flex flex-col max-w-[200px]">
          <h4 className="text-lg font-medium text-gray-600 pb-2">Console Logs</h4>
          <span className="text-sm text-gray-500">
            Generate a link to download a pdf for your console
          </span>
          <Button size="xxs" className="text-center mt-3" color="success">
            Get Logs
          </Button>
        </div>
        <div className="bg-blue-100 px-4 py-6 w-fit rounded-lg flex flex-col max-w-[200px]">
          <h4 className="text-lg font-medium text-gray-600 pb-2">Agent Logs</h4>
          <span className="text-sm text-gray-500">
            Generate a link to download a pdf for your host agent
          </span>
          <Button size="xxs" className="text-center mt-3" color="primary">
            Get Logs
          </Button>
          <div className="w-1/2">
            <Select
              value={''}
              name="region"
              onChange={(value) => {
                // setRegion(value);
              }}
              placeholder="Select host"
              sizing="xs"
            >
              {/* {AWS_REGIONS.map((region) => (
                <SelectItem value={region} key={region} />
              ))} */}
            </Select>
          </div>
        </div>
      </div>
    </Tabs>
  );
};

export const module = {
  element: <DiagnosisLogs />,
};
