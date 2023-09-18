import { Suspense, useEffect, useState } from 'react';
import { Button, Checkbox, CircleSpinner, Modal } from 'ui-components';

import {
  ISelected,
  SearchableScanTimeList,
} from '@/features/vulnerabilities/components/ScanResults/SearchableScanTimeList';
import { SearchableTagList } from '@/features/vulnerabilities/components/ScanResults/SearchableTagList';
import { useScanResults } from '@/features/vulnerabilities/pages/VulnerabilityScanResults';
import { VulnerabilityScanNodeTypeEnum } from '@/types/common';

const Tags = ({
  setSelectedTag,
}: {
  setSelectedTag: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { data } = useScanResults();

  return (
    <SearchableTagList
      scanType="none"
      triggerVariant="select"
      valueKey="nodeId"
      onChange={(value) => {
        setSelectedTag(value);
      }}
      onClearAll={() => {
        setSelectedTag('');
      }}
      filter={{
        dockerImageName: data.data?.dockerImageName ?? '',
      }}
    />
  );
};
type ToScanDataType = {
  toScanId: string;
  toScanTime: number | null;
};

const BaseInput = ({
  nodeId,
  nodeType,
  compareInput,
  toScanData,
  setToScanData,
}: {
  nodeId: string;
  nodeType: string;
  compareInput: {
    baseNodeName: string;
    baseScanId: string;
    toScanId: string;
    baseScanTime: number;
    toScanTime: number;
  };
  toScanData: ToScanDataType;
  setToScanData: React.Dispatch<React.SetStateAction<ToScanDataType>>;
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState(() => nodeId);
  const [withOtherTags, setWithOtherTags] = useState<boolean>(false);

  useEffect(() => {
    if (selectedNodeId) {
      setToScanData({
        toScanTime: null,
        toScanId: '',
      });
    }
  }, [selectedNodeId, withOtherTags]);

  return (
    <div className="flex flex-col gap-y-6">
      <Suspense fallback={<CircleSpinner size="sm" />}>
        {nodeType === VulnerabilityScanNodeTypeEnum.image ? (
          <>
            <Checkbox
              label="Compare with other tags"
              checked={withOtherTags}
              onCheckedChange={(checked: boolean) => {
                setWithOtherTags(checked);
              }}
            />
            {withOtherTags && <Tags setSelectedTag={setSelectedNodeId} />}
          </>
        ) : null}

        <SearchableScanTimeList
          triggerVariant="underline"
          defaultSelectedTime={toScanData.toScanTime ?? null}
          valueKey="nodeId"
          onChange={(data: ISelected) => {
            setToScanData({
              toScanTime: data.updatedAt,
              toScanId: data.scanId,
            });
          }}
          onClearAll={() => {
            setToScanData({
              toScanTime: null,
              toScanId: '',
            });
          }}
          nodeId={selectedNodeId}
          nodeType={nodeType}
          // skip scan time when base scan is same as to scan
          skipScanTime={nodeId === selectedNodeId ? compareInput.baseScanTime : undefined}
          noDataText="No scan to compare"
        />
      </Suspense>
    </div>
  );
};
export const CompareScanInputModal = ({
  showDialog,
  setShowDialog,
  scanHistoryData,
  setShowScanCompareModal,
  setCompareInput,
  nodeId,
  nodeType,
  compareInput,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  scanHistoryData: {
    updatedAt: number;
    scanId: string;
    status: string;
  }[];
  setShowScanCompareModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCompareInput: React.Dispatch<
    React.SetStateAction<{
      baseNodeName: string;
      baseScanId: string;
      toScanId: string;
      baseScanTime: number;
      toScanTime: number;
      showScanTimeModal: boolean;
    }>
  >;
  nodeId: string;
  nodeType: string;
  compareInput: {
    baseNodeName: string;
    baseScanId: string;
    toScanId: string;
    baseScanTime: number;
    toScanTime: number;
  };
}) => {
  const [toScanData, setToScanData] = useState<ToScanDataType>({
    toScanId: '',
    toScanTime: null,
  });

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => {
        setShowDialog(false);
      }}
      title="Select scan to compare"
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
            disabled={!toScanData.toScanTime}
            onClick={() => {
              const baseScan = scanHistoryData.find((data) => {
                return data.updatedAt === compareInput.baseScanTime;
              });
              setCompareInput({
                baseNodeName: '',
                baseScanId: baseScan?.scanId ?? '',
                toScanId: toScanData?.toScanId ?? '',
                baseScanTime: baseScan?.updatedAt ?? 0,
                toScanTime: toScanData?.toScanTime ?? 0,
                showScanTimeModal: false,
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
        <BaseInput
          nodeId={nodeId}
          nodeType={nodeType}
          compareInput={compareInput}
          setToScanData={setToScanData}
          toScanData={toScanData}
        />
      </div>
    </Modal>
  );
};
