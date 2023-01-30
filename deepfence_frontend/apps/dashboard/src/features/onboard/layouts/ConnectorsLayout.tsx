import { LoaderFunctionArgs, Outlet, redirect } from 'react-router-dom';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';

export const connectorsLoader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (['/onboard/connectors', '/onboard/connectors/'].includes(url.pathname)) {
    throw redirect('/onboard/connectors/add-connectors', 302);
  }
  return null;
};

export const connectorLayoutTabs: Array<{
  label: string;
  value: 'add-connectors' | 'my-connectors';
}> = [
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
  return (
    <>
      <ConnectorHeader
        title="Let's Get Started"
        description="ThreatMapper's unique approach learns the active topology of your application and classifies vulnerabilities based on the attack surfaces that your application presents."
      />
      <Outlet />
    </>
  );
};
