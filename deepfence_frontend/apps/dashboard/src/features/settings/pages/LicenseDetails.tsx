import { useSuspenseQuery } from '@suspensive/react-query';
import { upperFirst } from 'lodash-es';
import { Suspense } from 'react';
import { Card, CircleSpinner } from 'ui-components';

import { ModelLicense } from '@/api/generated';
import { queries } from '@/queries';

export const LicenseDetails = () => {
  return (
    <div className="space-y-2">
      <div className="mt-2">
        <h3 className="text-h6 dark:text-text-input-value">License details</h3>
      </div>
      <Suspense fallback={<CircleSpinner size="sm" />}>
        <LicenseDetailsContent />
      </Suspense>
    </div>
  );
};

const LicenseDetailsContent = () => {
  const { data: licenseData } = useSuspenseQuery({
    ...queries.setting.getCompanyLicense(),
  });

  return <LicenseCard licenseData={licenseData} />;
};

const LicenseCard = ({ licenseData }: { licenseData: ModelLicense }) => {
  return (
    <Card className="p-4 rounded-[5px]">
      <h4 className="text-status-error text-h4">
        {upperFirst(licenseData.message) ?? 'License'}
      </h4>
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex">
          <span className="text-p7 min-w-[160px] dark:text-text-text-and-icon">
            License key
          </span>
          <span className="text-p4 dark:text-text-input-value">
            {licenseData.key ?? '-'}
          </span>
        </div>
        <div className="flex">
          <span className="text-p7 min-w-[160px] dark:text-text-text-and-icon">
            License type
          </span>
          <span className="text-p4 dark:text-text-input-value capitalize">
            {(licenseData.license_type ?? '-').replaceAll('_', ' ')}
          </span>
        </div>
        <div className="flex">
          <span className="text-p7 min-w-[160px] dark:text-text-text-and-icon">
            End date
          </span>
          <span className="text-p4 dark:text-status-error">
            {licenseData.end_date ?? '-'}
          </span>
        </div>
        <div className="flex">
          <span className="text-p7 min-w-[160px] dark:text-text-text-and-icon">
            No. of hosts
          </span>
          <span className="text-p4 dark:text-text-input-value">
            {licenseData.no_of_hosts ?? '-'}
          </span>
        </div>
        <div className="flex">
          <span className="text-p7 min-w-[160px] dark:text-text-text-and-icon">
            Current No. of hosts
          </span>
          <span className="text-p4 dark:text-text-input-value">
            {licenseData.current_hosts ?? '-'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export const module = {
  element: <LicenseDetails />,
};
