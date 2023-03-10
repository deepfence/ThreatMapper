import { memo, useMemo } from 'react';
import { generatePath, useFetcher } from 'react-router-dom';
import { CircleSpinner, createColumnHelper, Switch, Table } from 'ui-components';

import { ModelCloudNodeComplianceControl } from '@/api/generated/models/ModelCloudNodeComplianceControl';
import { ActionEnumType } from '@/features/postures/data-component/listControlsApiLoader';

const ToggleControl = ({
  checked,
  controlId,
  nodeId,
  checkType,
  loading,
}: {
  checked: boolean;
  controlId: string;
  nodeId: string;
  checkType: string;
  loading: boolean;
}) => {
  const fetcher = useFetcher();
  if (loading) {
    return <CircleSpinner size="sm" />;
  }
  return (
    <Switch
      checked={checked}
      size="sm"
      onCheckedChange={(checked) => {
        const formData = new FormData();
        formData.append('nodeId', nodeId);
        formData.append(
          'actionType',
          !checked ? ActionEnumType.DISABLE : ActionEnumType.ENABLE,
        );
        formData.append('enabled', checked.toString());
        formData.append('controlId', controlId ?? '');
        fetcher.submit(formData, {
          method: 'post',
          action: generatePath('/data-component/list/controls/:checkType', {
            checkType,
          }),
        });
      }}
    />
  );
};
export const ControlsTable = memo(
  ({
    data,
    ...rest
  }: {
    data: ModelCloudNodeComplianceControl[];
    nodeId: string;
    checkType: string;
    loading: boolean;
  }) => {
    const columnHelper = createColumnHelper<ModelCloudNodeComplianceControl>();

    const columns = useMemo(
      () => [
        columnHelper.accessor('category_hierarchy', {
          id: 'category',
          cell: (info) => info.getValue()?.toString(),
          header: () => <span>Category</span>,
          maxSize: 100,
          size: 120,
          minSize: 130,
        }),
        columnHelper.accessor('title', {
          header: () => 'Description',
          cell: (info) => info.renderValue(),
          maxSize: 140,
          size: 150,
          minSize: 160,
        }),
        columnHelper.accessor('enabled', {
          enableSorting: false,
          header: () => 'Status',
          cell: (info) => {
            return (
              <ToggleControl
                {...rest}
                checked={!!info.row.original.enabled}
                controlId={info.row.original.control_id ?? ''}
              />
            );
          },
          maxSize: 40,
          size: 50,
          minSize: 60,
        }),
      ],
      [],
    );
    return (
      <Table
        size="sm"
        data={data}
        columns={columns}
        enablePagination
        enableColumnResizing
        enableSorting
      />
    );
  },
);
