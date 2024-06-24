import { Suspense, useEffect, useState } from 'react';
import { Button, Checkbox, CircleSpinner, Modal } from 'ui-components';

import { ModelNodeIdentifierNodeTypeEnum } from '@/api/generated';
import { ISelected, ScanTimeList } from '@/components/forms/ScanTimeList';
import { ImageTagType, SearchableTagList } from '@/components/forms/SearchableTagList';
import { useScanResults as malwareScanResults } from '@/features/malwares/pages/MalwareScanResults';
import { useScanResults as secretScanResults } from '@/features/secrets/pages/SecretScanResults';
import { useScanResults as vulnerabilityScanResults } from '@/features/vulnerabilities/pages/VulnerabilityScanResults';
import { ScanTypeEnum } from '@/types/common';

const useScanResults = ({ scanType }: { scanType: ScanTypeEnum }) => {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return vulnerabilityScanResults().data.data?.dockerImageName;
  } else if (scanType === ScanTypeEnum.SecretScan) {
    return secretScanResults().data.data?.dockerImageName;
  } else if (scanType === ScanTypeEnum.MalwareScan) {
    return malwareScanResults().data.data?.dockerImageName;
  }
  return '';
};

const Tags = ({
  selectedTag,
  setSelectedTag,
  scanType,
}: {
  selectedTag: ImageTagType | null;
  setSelectedTag: React.Dispatch<React.SetStateAction<ImageTagType | null>>;
  scanType: ScanTypeEnum;
}) => {
  const dockerImageName = useScanResults({
    scanType,
  });

  return (
    <SearchableTagList
      defaultSelectedTag={selectedTag}
      scanType="none"
      triggerVariant="select"
      valueKey="nodeId"
      onChange={(value) => {
        setSelectedTag(value);
      }}
      filter={{
        dockerImageName: dockerImageName ?? '',
      }}
    />
  );
};
type ToScanDataType = {
  toScanId: string;
  toScanTime: number | null;
};

const InputForm = ({
  nodeId,
  nodeType,
  scanType,
  compareInput,
  toScanData,
  setToScanData,
}: {
  nodeId: string;
  nodeType: string;
  scanType: string;
  compareInput: {
    baseScanId: string;
    toScanId: string;
    baseScanTime: number;
    toScanTime: number;
  };
  toScanData: ToScanDataType;
  setToScanData: React.Dispatch<React.SetStateAction<ToScanDataType>>;
}) => {
  const [selectedTag, setSelectedTag] = useState<ImageTagType | null>({
    nodeId,
    nodeName: '',
    tagList: [],
  });
  const [withOtherTags, setWithOtherTags] = useState<boolean>(false);

  // clear scan time when compare with other tags checkbox is checked
  useEffect(() => {
    if (withOtherTags) {
      setSelectedTag({
        nodeId: '',
        nodeName: '',
        tagList: [],
      });
    }
    setToScanData({
      toScanTime: null,
      toScanId: '',
    });
  }, [withOtherTags]);

  // clear to scan time when tag is selected
  useEffect(() => {
    if (selectedTag) {
      setToScanData({
        toScanTime: null,
        toScanId: '',
      });
    }
  }, [selectedTag]);

  return (
    <div className="flex flex-col gap-y-6">
      <>
        {nodeType === ModelNodeIdentifierNodeTypeEnum.Image && (
          <>
            <Checkbox
              label="Compare with other tags"
              checked={withOtherTags}
              onCheckedChange={(checked: boolean) => {
                setWithOtherTags(checked);
              }}
            />
            <Suspense fallback={<CircleSpinner size="sm" />}>
              {withOtherTags && (
                <Tags
                  setSelectedTag={setSelectedTag}
                  scanType={scanType as ScanTypeEnum}
                  selectedTag={selectedTag}
                />
              )}
            </Suspense>
          </>
        )}

        {withOtherTags ? (
          <ScanTimeList
            triggerVariant="underline"
            defaultSelectedTime={toScanData.toScanTime ?? null}
            valueKey="nodeId"
            onChange={(data: ISelected) => {
              setToScanData({
                toScanTime: data.createdAt,
                toScanId: data.scanId,
              });
            }}
            // node id should be selected tag nodeid
            nodeId={selectedTag?.nodeId}
            nodeType={nodeType}
            scanType={scanType as ScanTypeEnum}
            noDataText="No scan to compare"
          />
        ) : (
          <ScanTimeList
            triggerVariant="underline"
            defaultSelectedTime={toScanData.toScanTime ?? null}
            valueKey="nodeId"
            onChange={(data: ISelected) => {
              setToScanData({
                toScanTime: data.createdAt,
                toScanId: data.scanId,
              });
            }}
            nodeId={nodeId}
            nodeType={nodeType}
            scanType={scanType as ScanTypeEnum}
            // skip scan time when base scan is same as to scan
            skipScanTime={compareInput.baseScanTime}
            noDataText="No scan to compare"
          />
        )}
      </>
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
  scanType,
  compareInput,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  scanHistoryData: {
    createdAt: number;
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
      showScanTimeModal: boolean;
    }>
  >;
  nodeId: string;
  nodeType: string;
  scanType: string;
  compareInput: {
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
                return data.createdAt === compareInput.baseScanTime;
              });
              setCompareInput({
                baseScanId: baseScan?.scanId ?? '',
                toScanId: toScanData?.toScanId ?? '',
                baseScanTime: baseScan?.createdAt ?? 0,
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
        <InputForm
          nodeId={nodeId}
          nodeType={nodeType}
          scanType={scanType}
          compareInput={compareInput}
          setToScanData={setToScanData}
          toScanData={toScanData}
        />
      </div>
    </Modal>
  );
};
