import { LoaderFunction, Outlet, redirect, useLocation } from 'react-router-dom';
import { Tabs } from 'ui-components';

import { usePageNavigation } from '../../../utils/usePageNavigation';
import { ConnectorHeader } from '../components/ConnectorHeader';

export const connectorsLoader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  if (['/onboard/connectors', '/onboard/connectors/'].includes(url.pathname)) {
    throw redirect('/onboard/connectors/add-connectors', 302);
  }
  return null;
};

const tabs = [
  {
    label: 'Add Connectors',
    value: 'add-connectors',
  },
  {
    label: 'My Connectors',
    value: 'my-connectors',
  },
];

export const ConnectorsLayout = () => {
  const location = useLocation();
  const { navigate } = usePageNavigation();

  const tab = location.pathname.startsWith('/onboard/connectors/my-connectors')
    ? 'my-connectors'
    : 'add-connectors';

  const onTabChange = (tab: string) => {
    navigate(`/onboard/connectors/${tab}`);
  };

  return (
    <>
      <ConnectorHeader
        title="Let's Get Started"
        description="ThreatMapper's unique approach learns the active topology of your application and classifies vulnerabilities based on the attack surfaces that your application presents."
      />
      <Tabs
        value={tab}
        defaultValue={tab}
        tabs={tabs}
        onValueChange={onTabChange}
        size="md"
      >
        <div key={tab} className="h-full dark:text-white mt-8">
          <Outlet />
        </div>
      </Tabs>
    </>
  );
};
