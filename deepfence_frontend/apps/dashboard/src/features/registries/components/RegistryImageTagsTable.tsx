/* eslint-disable @typescript-eslint/no-empty-function */
import cx from 'classnames';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  createColumnHelper,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
} from 'ui-components';

import { ModelContainerImage } from '@/api/generated';

function generateRandomImgData() {
  const checked = false;
  const pushedAt = new Date(
    +new Date() - Math.floor(Math.random() * 10000000000),
  ).toISOString(); // generates a random date within the past 10,000,000,000 milliseconds (approximately 317 years)
  const imageTag = Math.random().toString(36).substring(2, 10); // generates a random string of length 8 using alphanumeric characters
  const platform = ['linux/amd64', 'linux/arm64', 'windows/amd64'][
    Math.floor(Math.random() * 3)
  ]; // generates a random platform from a list of options
  const size = Math.floor(Math.random() * 10000); // generates a random size between 0 and 9999
  const vulnerabilityScanStatus = ['Not_Scanned', 'In_Progress', 'Completed', 'Error'][
    Math.floor(Math.random() * 3)
  ]; // generates a random vulnerability scan status from a list of options
  const malwareScanStatus = ['Not_Scanned', 'In_Progress', 'Completed', 'Error'][
    Math.floor(Math.random() * 3)
  ]; // generates a random malware scan status from a list of options
  const secretsScanStatus = ['Not_Scanned', 'In_Progress', 'Completed', 'Error'][
    Math.floor(Math.random() * 4)
  ]; // generates a random secrets scan status from a list of options

  return {
    checked,
    pushedAt,
    imageTag,
    platform,
    size,
    vulnerabilityScanStatus,
    malwareScanStatus,
    secretsScanStatus,
  };
}
function generateRandomImgDataArray(size: number) {
  const imgDataArray = [];

  for (let i = 0; i < size; i++) {
    imgDataArray.push(generateRandomImgData());
  }

  return imgDataArray;
}

const numObjects = Math.floor(Math.random() * 21) + 10; // generates a random number between 10 and 30
const tagData = generateRandomImgDataArray(numObjects);

export const RegistryImageTagsTable = ({ data }: { data: ModelContainerImage[] }) => {
  const columnHelper = createColumnHelper<ModelContainerImage>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [tableData] = useState(tagData);
  // data[0].
  // todo: remove this
  useEffect(() => {
    console.log(rowSelectionState);
  }, [rowSelectionState]);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        size: 25,
        minSize: 10,
        maxSize: 25,
      }),
      columnHelper.accessor('docker_image_tag', {
        header: () => 'Image Tags',
        cell: (info) => {
          return info.renderValue();
        },
        maxSize: 40,
        minSize: 20,
      }),
      columnHelper.accessor('metadata', {
        header: () => 'Pushed at',
        cell: (info) => {
          const metadata = info.renderValue() || {};
          return metadata['pushed_at'];
        },
        maxSize: 50,
      }),
      columnHelper.accessor('docker_image_size', {
        header: () => 'Size',
        cell: (info) => info.renderValue() + ' KB',
        maxSize: 50,
      }),
      columnHelper.accessor('vulnerability_scan_status', {
        header: () => 'Vulnerability Scan Status',
        cell: (info) => (
          <Badge
            label={info.getValue().toUpperCase().replaceAll('_', ' ') || 'Not Scanned'}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                info.getValue().toLowerCase() === 'completed',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                info.getValue().toLowerCase() === 'error',
              'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                info.getValue().toLowerCase() === 'in_progress',
              'bg-blue-100 dark:bg-blue-600/10 text-neutral-600 dark:text-neutral-400':
                info.getValue().toLowerCase() === '' ||
                info.getValue().toLowerCase() === 'not_scanned',
            })}
            size="sm"
          />
        ),
        maxSize: 50,
      }),
      columnHelper.accessor('malware_scan_status', {
        header: () => 'Malware Scan Status',
        cell: (info) => (
          <Badge
            label={info.getValue().toUpperCase().replaceAll('_', ' ') || 'Not Scanned'}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                info.getValue().toLowerCase() === 'completed',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                info.getValue().toLowerCase() === 'error',
              'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                info.getValue().toLowerCase() === 'in_progress',
              'bg-blue-100 dark:bg-blue-600/10 text-neutral-600 dark:text-neutral-400':
                info.getValue().toLowerCase() === '' ||
                info.getValue().toLowerCase() === 'not_scanned',
            })}
            size="sm"
          />
        ),
        maxSize: 50,
      }),
      columnHelper.accessor('secret_scan_status', {
        header: () => 'Secrets Scan Status',
        cell: (info) => (
          <Badge
            label={info.getValue().toUpperCase().replaceAll('_', ' ') || 'Not Scanned'}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                info.getValue().toLowerCase() === 'completed',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                info.getValue().toLowerCase() === 'error',
              'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                info.getValue().toLowerCase() === 'in_progress',
              'bg-blue-100 dark:bg-blue-600/10 text-neutral-600 dark:text-neutral-400':
                info.getValue().toLowerCase() === '' ||
                info.getValue().toLowerCase() === 'not_scanned',
            })}
            size="sm"
          />
        ),
        maxSize: 50,
      }),
    ],
    [],
  );
  return (
    <>
      <Table
        columns={columns}
        data={data}
        enablePagination
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        enableSorting
        getRowId={(row) => row.docker_image_tag}
      />
    </>
  );
};
