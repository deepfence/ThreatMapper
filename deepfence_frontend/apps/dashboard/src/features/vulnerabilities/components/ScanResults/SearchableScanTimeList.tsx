import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';
import { isScanComplete } from '@/utils/scan';

interface SearchableTimeListProps {
  onChange?: (data: ISelected) => void;
  onClearAll?: () => void;
  defaultSelectedTime?: number | null;
  valueKey?: 'nodeId';
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
  nodeId?: string;
  nodeType?: string;
  skipScanTime?: number;
}

export interface ISelected {
  updatedAt: number;
  scanId: string;
}

const PAGE_SIZE = 15;
const SearchableScanTime = ({
  onChange,
  onClearAll,
  defaultSelectedTime,
  triggerVariant,
  helperText,
  color,
  nodeId,
  nodeType,
  skipScanTime,
}: SearchableTimeListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedTime, setSelectedTime] = useState<number | null>(
    defaultSelectedTime ?? null,
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedTime(defaultSelectedTime ?? null);
  }, [defaultSelectedTime]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.vulnerability.scanHistories({
        size: PAGE_SIZE,
        searchText,
        nodeId: nodeId ?? '',
        nodeType: nodeType ?? '',
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

  const searchTag = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <Combobox
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name="timeFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Select Scan Time' : undefined}
        getDisplayValue={() =>
          isSelectVariantType
            ? selectedTime
              ? formatMilliseconds(selectedTime)
              : ''
            : ''
        }
        placeholder="scan time"
        value={selectedTime as unknown as ISelected}
        onChange={(value: ISelected) => {
          setSelectedTime(value.updatedAt);
          onChange?.(value);
        }}
        onQueryChange={searchTag}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data?.pages
          .flatMap((page) => {
            return page.data;
          })
          .filter(
            (scan) => scan.updatedAt !== skipScanTime && isScanComplete(scan.status),
          )
          ?.map?.((scan) => {
            return (
              <ComboboxOption
                key={scan.updatedAt}
                value={
                  {
                    updatedAt: scan.updatedAt,
                    scanId: scan.scanId,
                  } as ISelected
                }
              >
                {formatMilliseconds(scan.updatedAt)}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableScanTimeList = (props: SearchableTimeListProps) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'Select time' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Select time"
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <SearchableScanTime {...props} />
    </Suspense>
  );
};
