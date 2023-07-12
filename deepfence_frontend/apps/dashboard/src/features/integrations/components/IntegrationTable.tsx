import { useParams } from 'react-router-dom';
import { Table } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import {
  ActionEnumType,
  useListIntegrations,
} from '@/features/integrations/pages/IntegrationAdd';

import { useIntegrationTableColumn } from './useIntegrationTableColumn';

export const IntegrationTable = ({
  onTableAction,
}: {
  onTableAction: (row: ModelIntegrationListResp, actionType: ActionEnumType) => void;
}) => {
  const columns = useIntegrationTableColumn(onTableAction);
  const { data: list } = useListIntegrations();

  const { data = [], message } = list ?? {};
  const params = useParams() as {
    integrationType: string;
  };

  if (message) {
    return <p className="text-red-500 text-sm">{message}</p>;
  }
  const tableData = data.filter(
    (integration) => params.integrationType === integration.integration_type,
  );

  return <Table data={tableData} columns={columns} enablePagination />;
};
