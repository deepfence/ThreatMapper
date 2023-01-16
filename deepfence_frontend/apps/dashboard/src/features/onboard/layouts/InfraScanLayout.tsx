import { Outlet } from 'react-router-dom';

import { ConnectorHeader } from '../components/ConnectorHeader';

export const ScanInfraLayout = () => {
  return (
    <div>
      <ConnectorHeader
        title="Choose your scan type"
        description="Choose from the below options to perform your first scan."
      />
      <Outlet />
    </div>
  );
};
