import { useSuspenseQuery } from '@suspensive/react-query';
import { upperFirst } from 'lodash-es';
import { ReactNode, Suspense, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  Outlet,
  useFetcher,
  useSearchParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getRulesApiClient } from '@/api/api';
import { ModelSecretRule } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { EyeHideSolid } from '@/components/icons/common/EyeHideSolid';
import { EyeSolidIcon } from '@/components/icons/common/EyeSolid';
import { SeverityBadgeIcon } from '@/components/SeverityBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { invalidateAllQueries, queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { SeverityValueType } from '@/utils/enum';
import { getPageFromSearchParams } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 25;

enum ActionEnumType {
  MASK_RULE = 'mask_rule',
  UNMASK_RULE = 'unmask_rule',
}

interface ActionData {
  action: ActionEnumType;
  success: boolean;
}

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const ruleIds = (formData.getAll('ruleIds[]') ?? []) as string[];
  const actionType = formData.get('actionType');

  if (actionType === ActionEnumType.MASK_RULE) {
    const maskApi = apiWrapper({
      fn: getRulesApiClient().maskRules,
    });

    const response = await maskApi({
      modelRulesActionRequest: {
        rule_ids: ruleIds,
      },
    });
    if (!response.ok) {
      console.error('masking unsuccessful', response.error);
      toast.success('Masking failed.');
      return {
        action: actionType,
        success: false,
      };
    }
    toast.success('Masked successfully');
    invalidateAllQueries();
    return {
      action: actionType,
      success: true,
    };
  } else if (actionType === ActionEnumType.UNMASK_RULE) {
    const unmaskApi = apiWrapper({
      fn: getRulesApiClient().unmaskRules,
    });

    const response = await unmaskApi({
      modelRulesActionRequest: {
        rule_ids: ruleIds,
      },
    });
    if (!response.ok) {
      console.error('unmasking unsuccessful', response.error);
      toast.success('Unmasking failed.');
      return {
        action: actionType,
        success: false,
      };
    }
    toast.success('Unmasked successfully');
    invalidateAllQueries();
    return {
      action: actionType,
      success: true,
    };
  }
  throw new Error(`invalid action type ${actionType}.`);
};

function useSecretRules() {
  const [searchParams] = useSearchParams();

  return useSuspenseQuery({
    ...queries.search.secretRulesWithPagination({
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      page: getPageFromSearchParams(searchParams),
    }),
    keepPreviousData: true,
  });
}

const BulkActions = ({
  selectedRows,
  onBulkAction,
}: {
  selectedRows: string[];
  onBulkAction: (selectedRows: string[], actionType: ActionEnumType) => void;
}) => {
  return (
    <>
      <Button
        color="default"
        variant="flat"
        size="sm"
        startIcon={<EyeSolidIcon />}
        disabled={!selectedRows.length}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onBulkAction(selectedRows, ActionEnumType.MASK_RULE);
        }}
      >
        Mask
      </Button>
      <Button
        color="default"
        variant="flat"
        size="sm"
        startIcon={<EyeHideSolid />}
        disabled={!selectedRows.length}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onBulkAction(selectedRows, ActionEnumType.UNMASK_RULE);
        }}
      >
        Unmask
      </Button>
    </>
  );
};

const ActionDropdown = ({
  trigger,
  onTableAction,
  masked,
  ruleId,
}: {
  ruleId: string;
  masked: boolean;
  trigger: ReactNode;
  onTableAction: (row: string, actionType: ActionEnumType) => void;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          {masked ? (
            <DropdownItem
              onSelect={() => onTableAction(ruleId, ActionEnumType.UNMASK_RULE)}
            >
              Unmask rule
            </DropdownItem>
          ) : (
            <DropdownItem
              onSelect={() => onTableAction(ruleId, ActionEnumType.MASK_RULE)}
            >
              Mask rule
            </DropdownItem>
          )}
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

const FeedsTable = ({
  rowSelectionState,
  setRowSelectionState,
  onTableAction,
}: {
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onTableAction: (row: string, actionType: ActionEnumType) => void;
}) => {
  const columnHelper = createColumnHelper<ModelSecretRule>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useSecretRules();
  const { mode: theme } = useTheme();

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        size: 30,
        minSize: 30,
        maxSize: 30,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            onTableAction={onTableAction}
            masked={cell.row.original.masked}
            ruleId={cell.row.original.rule_id ?? ''}
            trigger={
              <button className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                <EllipsisIcon />
              </button>
            }
          />
        ),
        header: () => '',
        size: 30,
        minSize: 30,
        maxSize: 30,
        enableResizing: false,
      }),
      columnHelper.accessor('rule_id', {
        header: () => 'Rule ID',
        cell: (info) => {
          const ruleId = info.getValue() ?? '';

          return (
            <DFLink
              to={{
                pathname: `./${encodeURIComponent(ruleId)}`,
                search: searchParams.toString(),
              }}
              className="flex items-center gap-x-[6px]"
            >
              <TruncatedText text={ruleId.replace('secret-', '')} />
            </DFLink>
          );
        },
        size: 120,
        minSize: 40,
        maxSize: 150,
      }),
      columnHelper.accessor('summary', {
        header: () => 'Summary',
        cell: (info) => {
          const value = info.getValue();
          return <TruncatedText text={value?.length ? value : '-'} />;
        },
        size: 200,
        minSize: 50,
        maxSize: 250,
      }),
      columnHelper.accessor('severity', {
        header: () => 'Severity',
        cell: (info) => {
          const value = info.getValue();
          if (!value?.length) return '-';
          return (
            <div className="flex items-center gap-x-2">
              <SeverityBadgeIcon
                severity={info.getValue() as SeverityValueType}
                theme={theme}
                className="w-[18px] h-[18px]"
              />
              {upperFirst(info.getValue())}
            </div>
          );
        },
        size: 120,
        minSize: 30,
        maxSize: 150,
      }),
      columnHelper.accessor('updated_at', {
        header: () => 'Updated at',
        cell: (info) => {
          return info.getValue() ? (
            <TruncatedText text={formatMilliseconds(info.getValue())} />
          ) : (
            '-'
          );
        },
        size: 120,
        minSize: 30,
        maxSize: 150,
      }),
    ];

    return columns;
  }, [theme, searchParams]);

  return (
    <Table
      data={data.rules ?? []}
      columns={columns}
      enablePagination
      manualPagination
      totalRows={data.totalRows}
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
      pageIndex={data.currentPage}
      onPaginationChange={(updaterOrValue) => {
        let newPageIndex = 0;
        if (typeof updaterOrValue === 'function') {
          newPageIndex = updaterOrValue({
            pageIndex: data.currentPage,
            pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
          }).pageIndex;
        } else {
          newPageIndex = updaterOrValue.pageIndex;
        }
        setSearchParams((prev) => {
          prev.set('page', String(newPageIndex));
          return prev;
        });
      }}
      enablePageResize
      onPageResize={(newSize) => {
        setSearchParams((prev) => {
          prev.set('size', String(newSize));
          prev.delete('page');
          return prev;
        });
      }}
      getRowId={(row) => {
        return row.rule_id ?? '';
      }}
      enableColumnResizing
      enableRowSelection
      rowSelectionState={rowSelectionState}
      onRowSelectionChange={setRowSelectionState}
      getTrProps={(row) => {
        if (row.original.masked) {
          return {
            className: 'opacity-40',
          };
        }
        return {};
      }}
    />
  );
};

const SecretFeeds = () => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const fetcher = useFetcher<ActionData>();

  const selectedRows = useMemo<string[]>(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  const onTableAction = (row: string, actionType: string) => {
    if (
      actionType === ActionEnumType.MASK_RULE ||
      actionType === ActionEnumType.UNMASK_RULE
    ) {
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('ruleIds[]', row);
      fetcher.submit(formData, {
        method: 'post',
      });
    }
  };

  const onBulkAction = (rows: string[], actionType: string) => {
    if (
      actionType === ActionEnumType.MASK_RULE ||
      actionType === ActionEnumType.UNMASK_RULE
    ) {
      const formData = new FormData();
      formData.append('actionType', actionType);
      rows.forEach((row) => {
        formData.append('ruleIds[]', row);
      });
      fetcher.submit(formData, {
        method: 'post',
      });
    }
  };

  return (
    <>
      <div className="mt-2">
        <h6 className="text-h6 text-text-input-value">Secret rules management</h6>
      </div>
      <div className="h-12 flex items-center">
        <BulkActions selectedRows={selectedRows} onBulkAction={onBulkAction} />
      </div>
      <div className="mb-2">
        <Suspense fallback={<TableSkeleton columns={7} rows={25} />}>
          <FeedsTable
            rowSelectionState={rowSelectionState}
            setRowSelectionState={setRowSelectionState}
            onTableAction={onTableAction}
          />
        </Suspense>
      </div>
      <Outlet />
    </>
  );
};

export const module = {
  element: <SecretFeeds />,
  action,
};
