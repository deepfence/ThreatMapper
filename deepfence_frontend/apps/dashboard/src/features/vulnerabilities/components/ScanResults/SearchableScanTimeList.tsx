import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Listbox, ListboxOption } from 'ui-components';

import { queries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';

interface IOption {
  updatedAt: number;
  scanId: string;
  status: string;
  nodeName: string;
}
interface SearchableTimeListProps {
  onChange?: (data: ISelected) => void;
  onClearAll?: () => void;
  defaultSelectedTime?: number | null;
  valueKey?: 'nodeId';
  triggerVariant?: 'underline' | 'default' | 'noBackground';
  helperText?: string;
  color?: 'error' | 'default';
  nodeId?: string;
  nodeType?: string;
  label?: string;
  noDataText?: string;
  shouldReverseOption?: boolean;
  renderOption?: (scan: IOption) => React.ReactNode;
  optionFilter?: (scan: IOption) => boolean;
  contentWidth?: 'default' | 'fit-content';
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
  triggerVariant = 'underline',
  helperText,
  color,
  nodeId,
  nodeType,
  label,
  noDataText,
  contentWidth,
  optionFilter,
  renderOption,
  shouldReverseOption,
}: SearchableTimeListProps) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(
    defaultSelectedTime ?? null,
  );

  useEffect(() => {
    setSelectedTime(defaultSelectedTime ?? null);
  }, [defaultSelectedTime]);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.vulnerability.scanHistories({
        size: PAGE_SIZE,
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

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  let options = data?.pages.flatMap((page) => {
    return page.data;
  });
  if (shouldReverseOption) {
    options = options.reverse();
  }
  return (
    <>
      <Listbox
        name="timeFilter"
        variant={triggerVariant}
        contentWidth={contentWidth}
        label={label}
        getDisplayValue={() => {
          if (selectedTime) {
            return formatMilliseconds(selectedTime);
          }
          return '';
        }}
        placeholder="scan time"
        value={selectedTime as unknown as ISelected}
        onChange={(value: ISelected) => {
          setSelectedTime(value.updatedAt);
          onChange?.(value);
        }}
        clearAll="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        noDataText={noDataText}
      >
        {options
          .filter(optionFilter ? optionFilter : (option) => option)
          ?.map?.((scan) => {
            return (
              <ListboxOption
                key={scan.updatedAt}
                value={
                  {
                    updatedAt: scan.updatedAt,
                    scanId: scan.scanId,
                  } as ISelected
                }
              >
                {renderOption ? renderOption(scan) : formatMilliseconds(scan.updatedAt)}
              </ListboxOption>
            );
          })}
      </Listbox>
    </>
  );
};

export const SearchableScanTimeList = (props: SearchableTimeListProps) => {
  const { label } = props;

  return (
    <Suspense
      fallback={
        <Listbox
          label={label}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Select time"
        />
      }
    >
      <SearchableScanTime {...props} />
    </Suspense>
  );
};
