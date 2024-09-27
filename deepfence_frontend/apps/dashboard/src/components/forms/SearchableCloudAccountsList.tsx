import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  CircleSpinner,
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerButton,
  ComboboxV2TriggerInput,
} from 'ui-components';

import { ModelCloudNodeAccountsListReqCloudProviderEnum } from '@/api/generated';
import { getDisplayNameOfNodeType } from '@/features/postures/utils';
import { queries } from '@/queries';
import { CloudNodeType } from '@/types/common';
import { useDebouncedValue } from '@/utils/useDebouncedValue';

export interface SearchableCloudAccountsListProps {
  cloudProvider?: CloudNodeType;
  onChange?: (value: string[]) => void;
  defaultSelectedAccounts?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  label?: string;
  helperText?: string;
  displayValue?: string;
  color?: 'error' | 'default';
}

const fieldName = 'cloudAccountsFilter';
const PAGE_SIZE = 15;
const SearchableCloudAccounts = ({
  cloudProvider,
  onChange,
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
  const debouncedSearchText = useDebouncedValue(searchText, 500);

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
        searchText: debouncedSearchText,
        active,
      }),
      keepPreviousData: true,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.accounts.length < PAGE_SIZE) return null;
        return allPages.length * PAGE_SIZE;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * PAGE_SIZE;
      },
    });

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <ComboboxV2Provider
        loading={isFetchingNextPage}
        name={fieldName}
        defaultSelectedValue={defaultSelectedAccounts ?? []}
        selectedValue={selectedAccounts}
        setSelectedValue={(values) => {
          setSelectedAccounts(values);
          onChange?.(values);
        }}
        value={searchText}
        setValue={setSearchText}
      >
        {isSelectVariantType ? (
          <ComboboxV2TriggerInput
            startIcon={
              isFetchingNextPage ? (
                <CircleSpinner size="sm" className="w-3 h-3" />
              ) : undefined
            }
            label={label}
            helperText={helperText}
            color={color}
            placeholder={`Select ${getDisplayNameOfNodeType(
              cloudProvider as ModelCloudNodeAccountsListReqCloudProviderEnum,
            ).toLowerCase()}`}
            getDisplayValue={() => {
              return selectedAccounts.length > 0
                ? `${selectedAccounts.length} selected`
                : null;
            }}
          />
        ) : (
          <ComboboxV2TriggerButton>
            {displayValue
              ? displayValue
              : `${cloudProvider} ${getDisplayNameOfNodeType(
                  cloudProvider as ModelCloudNodeAccountsListReqCloudProviderEnum,
                ).toLowerCase()}`}
          </ComboboxV2TriggerButton>
        )}
        <ComboboxV2Content
          width={isSelectVariantType ? 'anchor' : 'fixed'}
          clearButtonContent="Clear"
          onEndReached={onEndReached}
          searchPlaceholder="Search"
        >
          {data?.pages
            .flatMap((page) => {
              return page.accounts;
            })
            .map((account, index) => {
              return (
                <ComboboxV2Item
                  key={`${account.nodeId}-${index}`}
                  value={account[valueKey]}
                >
                  {account.nodeName}
                </ComboboxV2Item>
              );
            })}
        </ComboboxV2Content>
      </ComboboxV2Provider>
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
          <ComboboxV2Provider
            name={fieldName}
            defaultSelectedValue={defaultSelectedAccounts}
            loading={true}
          >
            {triggerVariant === 'select' ? (
              <ComboboxV2TriggerInput
                label={label}
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
                placeholder={`Select ${getDisplayNameOfNodeType(
                  cloudProvider as ModelCloudNodeAccountsListReqCloudProviderEnum,
                ).toLowerCase()}`}
                getDisplayValue={() => {
                  return displayValue
                    ? displayValue
                    : cloudProvider
                      ? `${cloudProvider} ${getDisplayNameOfNodeType(
                          cloudProvider as ModelCloudNodeAccountsListReqCloudProviderEnum,
                        ).toLowerCase()}`
                      : `Cloud`;
                }}
              />
            ) : (
              <ComboboxV2TriggerButton
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
              >
                {displayValue
                  ? displayValue
                  : cloudProvider
                    ? `${cloudProvider} ${getDisplayNameOfNodeType(
                        cloudProvider as ModelCloudNodeAccountsListReqCloudProviderEnum,
                      ).toLowerCase()}`
                    : `Cloud`}
              </ComboboxV2TriggerButton>
            )}
          </ComboboxV2Provider>
        </>
      }
    >
      <SearchableCloudAccounts {...props} />
    </Suspense>
  );
};
