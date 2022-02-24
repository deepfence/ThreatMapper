import React from 'react';
import SecretScanStatsCount from './secret-scan-stats-count';
import SecretScanStatsTopHosts from './secret-scan-stats-top-hosts';
import SecretScanStatsTopContainers from './secret-scan-stats-top-containers';

const SecretScanStatsView = () => (
  <div className="compliance-stats-view">
    <SecretScanStatsCount />
    <SecretScanStatsTopContainers />
    <SecretScanStatsTopHosts />
  </div>
);

export default SecretScanStatsView;
