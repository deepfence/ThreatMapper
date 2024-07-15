import { Outlet, useSearchParams } from 'react-router-dom';
import { Switch } from 'ui-components';

import { action } from '@/features/postures/components/scan-result/cloud/action';
import { CloudPostureResults } from '@/features/postures/components/scan-result/cloud/CloudPostureResults';
import { CloudPostureResultsGrouped } from '@/features/postures/components/scan-result/cloud/CloudPostureResultsGrouped';
import { Header } from '@/features/postures/components/scan-result/cloud/Header';
import { ScanHistory } from '@/features/postures/components/scan-result/cloud/ScanHistory';
import { Widgets } from '@/features/postures/components/scan-result/cloud/Widgets';

const PostureCloudScanResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const groupedByIssues = searchParams.get('groupByControls') === 'true';

  return (
    <>
      <Header />
      <div className="mx-4">
        <ScanHistory />
        <Widgets />
        <div className="mt-4 flex">
          <h2 className="text-text-text-and-icon uppercase text-t3">Scan Results</h2>
          <div className="ml-auto">
            <Switch
              checked={groupedByIssues}
              onCheckedChange={(checked) => {
                setSearchParams((prev) => {
                  if (checked) {
                    prev.set('groupByControls', 'true');
                    prev.delete('controlId');
                    prev.delete('benchmarkType');
                  } else {
                    prev.set('groupByControls', 'false');
                  }
                  prev.delete('page');
                  return prev;
                });
              }}
              label="Group results by controls"
            />
          </div>
        </div>
        {groupedByIssues ? <CloudPostureResultsGrouped /> : <CloudPostureResults />}
        <Outlet />
      </div>
    </>
  );
};
export const module = {
  action,
  element: <PostureCloudScanResults />,
};
