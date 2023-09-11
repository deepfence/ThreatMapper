import { useSuspenseInfiniteQuery, useSuspenseQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  CircleSpinner,
  Combobox,
  ComboboxOption,
  Listbox,
  ListboxOption,
  Modal,
} from 'ui-components';

import { queries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';
import { isScanComplete } from '@/utils/scan';

const useGetTagsForImage = (nodeId: string) => {
  return useSuspenseQuery({
    ...queries.search.containerImages({
      size: 99999,
      scanType: 'none',
      nodeId,
    }),
    select: (data) => {
      return data.containerImages[0].tagList;
    },
  });
};

interface SearchableTimeListProps {
  onChange?: (value: number) => void;
  onClearAll?: () => void;
  defaultSelectedTime?: number;
  valueKey?: 'nodeId';
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
  nodeId?: string;
  tag?: string;
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
  tag,
}: SearchableTimeListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedTime, setSelectedTime] = useState<number>(defaultSelectedTime ?? 0);

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedTime(defaultSelectedTime ?? 0);
  }, [defaultSelectedTime]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.vulnerability.searchVulnerabilities({
        size: PAGE_SIZE,
        searchText,
        nodeId: nodeId ?? '',
        tag: tag ?? '',
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
  console.log('========', data);
  return (
    <>
      <Combobox
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name="timeFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Host' : undefined}
        getDisplayValue={() =>
          isSelectVariantType ? formatMilliseconds(selectedTime) : ''
        }
        placeholder="Select pod"
        value={selectedTime}
        onChange={(value: number) => {
          setSelectedTime(value);
          onChange?.(value);
        }}
        onQueryChange={searchTag}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data.map((pod) => {
          return (
            <ComboboxOption key={pod.nodeId} value={pod.nodeName}>
              {pod.nodeName}
            </ComboboxOption>
          );
        })}
      </Combobox>
    </>
  );
};

const SearchableScanTimeList = (props: SearchableTimeListProps) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'Select tags' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Select pod"
          multiple
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

const Tags = ({
  nodeId,
  baseScanTime,
  selectedTag,
  setSelectedTag,
}: {
  nodeId: string;
  baseScanTime: number | null;
  selectedTag: string;
  setSelectedTag: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { data } = useGetTagsForImage(nodeId);

  return (
    <Listbox
      label="Select scan time to compare vulnerabilities"
      value={selectedTag}
      name="region"
      onChange={(value: string) => {
        setSelectedTag(value);
      }}
      placeholder="Select scan time"
      getDisplayValue={() => {
        return selectedTag;
      }}
    >
      {data.map((item) => (
        <ListboxOption value={item} key={item}>
          {item}
        </ListboxOption>
      ))}
    </Listbox>
  );
};
const BaseInput = ({
  nodeId,
  baseScanTime,
}: {
  nodeId: string;
  baseScanTime: number | null;
}) => {
  const [selectedScanTime, setSelectedScanTime] = useState(0);
  const [selectedTag, setSelectedTag] = useState('');

  return (
    <div className="flex flex-col gap-y-6">
      <Tags
        nodeId={nodeId}
        baseScanTime={baseScanTime}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />
      <SearchableScanTimeList
        defaultSelectedTime={selectedScanTime}
        onClearAll={() => {
          setSelectedScanTime(0);
        }}
        onChange={(value) => {
          setSelectedScanTime(value);
        }}
        nodeId={nodeId}
      />
    </div>
  );
};
export const CompareScanInputModal = ({
  showDialog,
  baseScanTime,
  setShowDialog,
  scanHistoryData,
  setShowScanCompareModal,
  setCompareInput,
  nodeId,
}: {
  showDialog: boolean;
  baseScanTime: number | null;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  scanHistoryData: {
    updatedAt: number;
    scanId: string;
    status: string;
  }[];
  setShowScanCompareModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCompareInput: React.Dispatch<
    React.SetStateAction<{
      baseScanId: string;
      toScanId: string;
      baseScanTime: number;
      toScanTime: number;
    }>
  >;
  nodeId: string;
}) => {
  const [selectedScanTime, setSelectedScanTime] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const [baseTag, setBaseTag] = useState<string[]>([]);

  if (!baseScanTime) {
    console.warn('Base scan time is required for comparision');
    return null;
  }

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => {
        setShowDialog(false);
      }}
      title="Select scan time"
      footer={
        <div className={'flex gap-x-4 justify-end'}>
          <Button
            size="md"
            onClick={() => {
              setShowDialog(false);
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            size="md"
            type="button"
            onClick={() => {
              const toScan = scanHistoryData.find((data) => {
                return data.updatedAt === selectedScanTime;
              });
              const baseScan = scanHistoryData.find((data) => {
                return data.updatedAt === baseScanTime;
              });
              setCompareInput({
                baseScanId: baseScan?.scanId ?? '',
                toScanId: toScan?.scanId ?? '',
                baseScanTime: baseScan?.updatedAt ?? 0,
                toScanTime: toScan?.updatedAt ?? 0,
              });
              setShowDialog(false);
              setShowScanCompareModal(true);
            }}
          >
            Compare
          </Button>
        </div>
      }
    >
      <div className="grid">
        {/* <SearchableTagList
          defaultSelectedTags={baseTags}
          onClearAll={() => {
            setBaseTags([]);
          }}
          onChange={(value) => {
            setBaseTags(value);
          }}
          nodeId={nodeId}
        /> */}
        <BaseInput nodeId={nodeId} baseScanTime={baseScanTime} />
      </div>
    </Modal>
  );
};
