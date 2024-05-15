import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { RowSelectionState, Table, TableNoDataElement } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import {
  ActionEnumType,
  useListIntegrations,
} from '@/features/integrations/pages/IntegrationAdd';

import { useIntegrationTableColumn } from './useIntegrationTableColumn';

const DEFAULT_PAGE_SIZE = 10;

export const IntegrationTable = ({
  onTableAction,
  rowSelectionState,
  setRowSelectionState,
}: {
  onTableAction: (row: ModelIntegrationListResp, actionType: ActionEnumType) => void;
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const columns = useIntegrationTableColumn(onTableAction);
  const { data: list } = useListIntegrations();

  const { data = [], message } = list ?? {};
  const params = useParams() as {
    integrationType: string;
  };

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  if (message) {
    return <p className="text-status-error text-p7">{message}</p>;
  }
  const tableData = data.filter(
    (integration) => params.integrationType === integration.integration_type,
  );

  return (
    <Table
      data={tableData}
      columns={columns}
      enablePagination
      enablePageResize
      pageSize={pageSize}
      onPageResize={(newSize) => {
        setPageSize(newSize);
      }}
      enableRowSelection
      rowSelectionState={rowSelectionState}
      onRowSelectionChange={setRowSelectionState}
      getRowId={(row) => `${row.id}`}
      noDataElement={
        <TableNoDataElement text="No integrations found, please add new integration" />
      }
    />
  );
};
