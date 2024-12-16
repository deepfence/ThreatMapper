import { Suspense, useEffect, useState } from 'react';
import { Button, Checkbox, CircleSpinner, Modal } from 'ui-components';

import { ModelNodeIdentifierNodeTypeEnum } from '@/api/generated';
import { ScanTimeList } from '@/components/forms/ScanTimeList';
import { ImageTagType, SearchableTagList } from '@/components/forms/SearchableTagList';
import { useScanResults as useMalwareScanResults } from '@/features/malwares/pages/MalwareScanResults';
import { useScanResults as useSecretScanResults } from '@/features/secrets/pages/SecretScanResults';
import { useScanResults as useVulnerabilityScanResults } from '@/features/vulnerabilities/pages/VulnerabilityScanResults';
import { ScanTypeEnum } from '@/types/common';

const useScanResults = ({ scanType }: { scanType: ScanTypeEnum }) => {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return useVulnerabilityScanResults().data.data?.dockerImageName;
  } else if (scanType === ScanTypeEnum.SecretScan) {
    return useSecretScanResults().data.data?.dockerImageName;
  } else if (scanType === ScanTypeEnum.MalwareScan) {
    return useMalwareScanResults().data.data?.dockerImageName;
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

const InputForm = ({
  nodeId,
  nodeType,
  scanType,
  toScanData,
  setToScanData,
  baseScanInfo,
}: {
  nodeId: string;
  nodeType: string;
  scanType: string;
  baseScanInfo: {
    scanId: string;
    createdAt: number;
  };
  toScanData: { scanId: string; createdAt: number } | null;
  setToScanData: React.Dispatch<
    React.SetStateAction<{ scanId: string; createdAt: number } | null>
  >;
}) => {
  const [selectedTag, setSelectedTag] = useState<ImageTagType | null>(null);
  const [withOtherTags, setWithOtherTags] = useState<boolean>(false);

  // clear scan time when compare with other tags checkbox is checked
  useEffect(() => {
    if (withOtherTags) {
      setSelectedTag(null);
    }
    setToScanData(null);
  }, [withOtherTags]);

  // clear to scan time when tag is selected
  useEffect(() => {
    if (selectedTag) {
      setToScanData(null);
    }
  }, [selectedTag]);

  return (
    <div className="flex flex-col gap-y-6">
      <>
        {(
          [
            ModelNodeIdentifierNodeTypeEnum.Image,
            ModelNodeIdentifierNodeTypeEnum.Container,
          ] as string[]
        ).includes(nodeType) && (
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
            defaultSelectedTime={toScanData?.createdAt ?? null}
            valueKey="nodeId"
            onChange={(data) => {
              setToScanData({
                createdAt: data.createdAt,
                scanId: data.scanId,
              });
            }}
            // node id should be selected tag nodeid
            nodeId={selectedTag?.nodeId}
            nodeType={ModelNodeIdentifierNodeTypeEnum.Image}
            scanType={scanType as ScanTypeEnum}
            noDataText="No scan to compare"
          />
        ) : (
          <ScanTimeList
            triggerVariant="underline"
            defaultSelectedTime={toScanData?.createdAt ?? null}
            valueKey="nodeId"
            onChange={(data) => {
              setToScanData({
                createdAt: data.createdAt,
                scanId: data.scanId,
              });
            }}
            nodeId={nodeId}
            nodeType={nodeType}
            scanType={scanType as ScanTypeEnum}
            // skip scan time when base scan is same as to scan
            skipScanTime={baseScanInfo.createdAt}
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
  nodeId,
  nodeType,
  scanType,
  baseScanInfo,
}: {
  showDialog: boolean;
  setShowDialog: (
    open: boolean,
    compareToScanInfo: { scanId: string; createdAt: number } | null,
  ) => void;
  nodeId: string;
  nodeType: string;
  scanType: string;
  baseScanInfo: {
    scanId: string;
    createdAt: number;
  };
}) => {
  const [toScanData, setToScanData] = useState<{
    scanId: string;
    createdAt: number;
  } | null>(null);

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={(open) => {
        setShowDialog(open, null);
      }}
      title="Select scan to compare"
      footer={
        <div className={'flex gap-x-4 justify-end'}>
          <Button
            size="md"
            onClick={() => {
              setShowDialog(false, null);
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            size="md"
            type="button"
            disabled={!toScanData}
            onClick={() => {
              setShowDialog(false, toScanData);
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
          baseScanInfo={baseScanInfo}
          setToScanData={setToScanData}
          toScanData={toScanData}
        />
      </div>
    </Modal>
  );
};
