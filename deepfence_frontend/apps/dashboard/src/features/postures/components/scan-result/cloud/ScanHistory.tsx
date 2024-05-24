import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useState } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import {
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { CompareScanInputModal } from '@/components/forms/CompareScanInputModal';
import { BalanceLineIcon } from '@/components/icons/common/BalanceLine';
import { ClockLineIcon } from '@/components/icons/common/ClockLine';
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { StopScanForm } from '@/components/scan-configure-forms/StopScanForm';
import { ScanHistoryDropdown } from '@/components/scan-history/HistoryList';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { useScanResults } from '@/features/postures/components/scan-result/cloud/hooks';
import { DeleteScanConfirmationModal } from '@/features/postures/components/scan-result/cloud/Modals';
import { PosturesCloudCompare } from '@/features/postures/components/scan-result/PosturesCloudCompare';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
import { isScanComplete, isScanDeletePending, isScanInProgress } from '@/utils/scan';
import { usePageNavigation } from '@/utils/usePageNavigation';

// #region history
export const ScanHistory = () => {
  return (
    <div className="flex items-center h-12">
      <span className="h-3.5 w-3.5 text-text-input-value">
        <ClockLineIcon />
      </span>
      <span className="pl-2 pr-3 text-t3 text-text-text-and-icon uppercase">
        scan time
      </span>
      <Suspense
        fallback={
          <div className="text-text-text-and-icon text-p9">Fetching scan history...</div>
        }
      >
        <HistoryControls />
      </Suspense>
    </div>
  );
};
const HistoryControls = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data, fetchStatus } = useScanResults();
  const { nodeType = '' } = useParams();
  const { scanStatusResult } = data;
  const { navigate, goBack } = usePageNavigation();
  const { downloadScan } = useDownloadScan((state) => {
    setIsSubmitting(state === 'submitting');
  });

  const [openStopScanModal, setOpenStopScanModal] = useState(false);
  const { scan_id, node_id, node_type, created_at, status } = scanStatusResult ?? {};

  const [showScanCompareModal, setShowScanCompareModal] = useState<boolean>(false);

  const [scanIdToDelete, setScanIdToDelete] = useState<string | null>(null);

  const [compareInput, setCompareInput] = useState<{
    baseScanId: string;
    toScanId: string;
    baseScanTime: number;
    toScanTime: number;
    showScanTimeModal: boolean;
  }>({
    baseScanId: '',
    toScanId: '',
    baseScanTime: created_at ?? 0,
    toScanTime: 0,
    showScanTimeModal: false,
  });

  const { data: historyData, refetch } = useSuspenseQuery({
    ...queries.common.scanHistories({
      scanType: ScanTypeEnum.CloudComplianceScan,
      nodeId: node_id ?? '',
      nodeType: 'cloud_account',
      size: Number.MAX_SAFE_INTEGER,
    }),
  });

  useEffect(() => {
    refetch();
  }, [scan_id]);

  if (!node_id || !node_type || !scan_id) {
    throw new Error('Scan id, Node type and Node id are required');
  }

  const onCompareScanClick = (baseScanTime: number) => {
    setCompareInput({
      ...compareInput,
      baseScanTime,
      showScanTimeModal: true,
    });
  };

  return (
    <div className="flex items-center relative flex-grow gap-4">
      {openStopScanModal && (
        <StopScanForm
          open={openStopScanModal}
          closeModal={setOpenStopScanModal}
          scanIds={[scan_id]}
          scanType={ScanTypeEnum.CloudComplianceScan}
        />
      )}
      {compareInput.showScanTimeModal && (
        <CompareScanInputModal
          showDialog={true}
          setShowDialog={() => {
            setCompareInput((input) => {
              return {
                ...input,
                showScanTimeModal: false,
              };
            });
          }}
          setShowScanCompareModal={setShowScanCompareModal}
          scanHistoryData={historyData.data}
          setCompareInput={setCompareInput}
          compareInput={compareInput}
          nodeId={node_id}
          nodeType={node_type}
          scanType={ScanTypeEnum.CloudComplianceScan}
        />
      )}
      {showScanCompareModal && (
        <PosturesCloudCompare
          open={showScanCompareModal}
          onOpenChange={setShowScanCompareModal}
          compareInput={compareInput}
        />
      )}
      <div className="flex items-center gap-x-3">
        <ScanHistoryDropdown
          scans={[...(historyData?.data ?? [])].reverse().map((item) => ({
            id: item.scanId,
            isCurrent: item.scanId === scan_id,
            status: item.status,
            timestamp: item.createdAt,
            showScanCompareButton: true,
            onScanTimeCompareButtonClick: onCompareScanClick,
            onDeleteClick: (id) => {
              setScanIdToDelete(id);
            },
            onDownloadClick: () => {
              downloadScan({
                scanId: item.scanId,
                scanType: UtilsReportFiltersScanTypeEnum.CloudCompliance,
                nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
              });
            },
            onScanClick: () => {
              navigate(
                generatePath(`/posture/cloud/scan-results/:nodeType/:scanId`, {
                  scanId: encodeURIComponent(item.scanId),
                  nodeType: nodeType,
                }),
                {
                  replace: true,
                },
              );
            },
          }))}
          currentTimeStamp={formatMilliseconds(created_at ?? '')}
        />

        {scanIdToDelete && (
          <DeleteScanConfirmationModal
            scanId={scanIdToDelete}
            open={!!scanIdToDelete}
            onOpenChange={(open, deleteSuccessful) => {
              if (!open) {
                if (deleteSuccessful && scanIdToDelete === scan_id) {
                  const latestScan = [...historyData.data].reverse().find((scan) => {
                    return scan.scanId !== scanIdToDelete;
                  });
                  if (latestScan) {
                    navigate(
                      generatePath('./../:scanId', {
                        scanId: encodeURIComponent(latestScan.scanId),
                      }),
                      { replace: true },
                    );
                  } else {
                    goBack();
                  }
                }
                setScanIdToDelete(null);
              }
            }}
          />
        )}
        <div className="h-3 w-[1px] dark:bg-bg-grid-border bg-bg-border-form"></div>
        <ScanStatusBadge status={status ?? ''} className="text-p1" />
        {!isScanInProgress(status ?? '') && !isScanDeletePending(status ?? '') ? (
          <>
            <div className="h-3 w-[1px] dark:bg-bg-grid-border bg-bg-border-form"></div>
            <div className="pl-1.5 flex">
              <Button
                variant="flat"
                startIcon={
                  <span className="h-3 w-3">
                    <DownloadLineIcon />
                  </span>
                }
                disabled={fetchStatus !== 'idle' || isSubmitting}
                loading={isSubmitting}
                size="md"
                onClick={() => {
                  downloadScan({
                    scanId: scan_id ?? '',
                    scanType: UtilsReportFiltersScanTypeEnum.CloudCompliance,
                    nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
                  });
                }}
              >
                Download
              </Button>
              <Button
                variant="flat"
                startIcon={
                  <span className="h-3 w-3">
                    <TrashLineIcon />
                  </span>
                }
                disabled={fetchStatus !== 'idle'}
                onClick={() => setScanIdToDelete(scan_id ?? '')}
              >
                Delete
              </Button>
              <>
                {isScanComplete(status ?? '') && (
                  <Button
                    variant="flat"
                    startIcon={
                      <span className="h-3 w-3">
                        <BalanceLineIcon />
                      </span>
                    }
                    disabled={fetchStatus !== 'idle'}
                    onClick={() => {
                      setCompareInput({
                        ...compareInput,
                        baseScanTime: created_at ?? 0,
                        showScanTimeModal: true,
                      });
                    }}
                  >
                    Compare scan
                  </Button>
                )}
              </>
            </div>
          </>
        ) : (
          <>
            {!isScanDeletePending(status ?? '') ? (
              <Button
                type="button"
                variant="flat"
                size="sm"
                className="absolute right-0 top-0"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenStopScanModal(true);
                }}
              >
                Cancel scan
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
// #endregion
