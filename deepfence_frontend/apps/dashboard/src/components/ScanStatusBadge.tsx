import cx from 'classnames';
import { Badge } from 'ui-components';

import {
  isNeverScanned,
  isScanComplete,
  isScanFailed,
  isScanInProgress,
} from '@/utils/scan';

export const ScanStatusBadge = ({ status }: { status: string }) => {
  return (
    <Badge
      label={(isNeverScanned(status) ? 'NEVER_SCANNED' : status).replaceAll('_', ' ')}
      className={cx('max-w-full w-fit truncate', {
        'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
          isScanComplete(status),
        'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
          isScanFailed(status),
        'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
          isScanInProgress(status),
        'bg-gray-100 dark:bg-gray-600/10 text-gray-600 dark:text-gray-400':
          isNeverScanned(status),
      })}
      size="sm"
    />
  );
};
