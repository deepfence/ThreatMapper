import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { ModelCloudNodeAccountsListReqCloudProviderEnum } from '@/api/generated';
import { getDisplayNameOfNodeType } from '@/features/postures/utils';
import { queries } from '@/queries';
import { CloudNodeType } from '@/types/common';

export type SearchableCloudAccountsListProps = {
  cloudProvider?: CloudNodeType;
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedAccounts?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  label?: string;
  helperText?: string;
  displayValue?: string;
  color?: 'error' | 'default';
};

const fieldName = 'cloudAccountsFilter';
const PAGE_SIZE = 15;
const SearchableCloudAccounts = ({
  cloudProvider,
  onChange,
  onClearAll,
  defaultSelectedAccounts,
  valueKey = 'nodeId',
  active,
  triggerVariant,
  label,
  helperText,
  color,
  displayValue,
}: SearchableCloudAccountsListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    defaultSelectedAccounts ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedAccounts(defaultSelectedAccounts ?? []);
  }, [defaultSelectedAccounts]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.search.cloudAccounts({
        cloudProvider,
        size: PAGE_SIZE,
        searchText,
        active,
      }),
      keepPreviousData: true,
      getNextPageParam: (lastPage, allPages) => {
        return allPages.length * PAGE_SIZE;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * PAGE_SIZE;
      },
    });

  const searchAccount = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <Combobox
        label={label}
        triggerVariant={triggerVariant}
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name={fieldName}
        getDisplayValue={() =>
          isSelectVariantType && selectedAccounts.length > 0
            ? `${selectedAccounts.length} selected`
            : cloudProvider
            ? displayValue
              ? displayValue
              : `${cloudProvider} ${getDisplayNameOfNodeType(
                  cloudProvider as ModelCloudNodeAccountsListReqCloudProviderEnum,
                ).toLowerCase()}`
            : 'Cloud'
        }
        multiple
        value={selectedAccounts}
        onChange={(values) => {
          setSelectedAccounts(values);
          onChange?.(values);
        }}
        onQueryChange={searchAccount}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data?.pages
          .flatMap((page) => {
            return page.accounts;
          })
          .map((account, index) => {
            return (
              <ComboboxOption
                key={`${account.nodeId}-${index}`}
                value={account[valueKey]}
              >
                {account.nodeName}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableCloudAccountsList = (props: SearchableCloudAccountsListProps) => {
  const {
    cloudProvider,
    label,
    triggerVariant,
    displayValue,
    defaultSelectedAccounts = [],
  } = props;
  return (
    <Suspense
      fallback={
        <>
          <Combobox
            name={fieldName}
            value={defaultSelectedAccounts}
            label={label}
            triggerVariant={triggerVariant}
            startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
            getDisplayValue={() => {
              return displayValue
                ? displayValue
                : cloudProvider
                ? `${cloudProvider} ${getDisplayNameOfNodeType(
                    cloudProvider as ModelCloudNodeAccountsListReqCloudProviderEnum,
                  ).toLowerCase()}`
                : `Cloud`;
            }}
            multiple
            onQueryChange={() => {
              // no operation
            }}
          />
        </>
      }
    >
      <SearchableCloudAccounts {...props} />
    </Suspense>
  );
};
