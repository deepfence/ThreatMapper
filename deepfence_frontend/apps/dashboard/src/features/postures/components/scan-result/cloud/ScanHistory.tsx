import { Suspense, useState } from 'react';
import { generatePath } from 'react-router-dom';
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
import { HistoryControlsSkeleton } from '@/components/scan-history/HistoryControlsSkeleton';
import { ScanHistoryDropdown } from '@/components/scan-history/ScanHistoryDropdown';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import {
  usePageParams,
  useScanStatus,
} from '@/features/postures/components/scan-result/cloud/hooks';
import { DeleteScanConfirmationModal } from '@/features/postures/components/scan-result/cloud/Modals';
import { PosturesCloudCompare } from '@/features/postures/components/scan-result/PosturesCloudCompare';
import { ScanTypeEnum } from '@/types/common';
import { isScanComplete, isScanDeletePending, isScanInProgress } from '@/utils/scan';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const ScanHistory = () => {
  return (
    <div className="flex items-center h-12">
      <span className="h-3.5 w-3.5 text-text-input-value">
        <ClockLineIcon />
      </span>
      <span className="pl-2 pr-3 text-t3 text-text-text-and-icon uppercase">
        scan time
      </span>
      <Suspense fallback={<HistoryControlsSkeleton />}>
        <HistoryControls />
      </Suspense>
    </div>
  );
};

const HistoryControls = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data, fetchStatus } = useScanStatus();
  const { nodeType } = usePageParams();

  const { navigate, goBack } = usePageNavigation();
  const { downloadScan } = useDownloadScan((state) => {
    setIsSubmitting(state === 'submitting');
  });

  const [openStopScanModal, setOpenStopScanModal] = useState(false);
  const { scan_id, node_id, node_type, created_at, status } = data;

  const [showScanCompareModal, setShowScanCompareModal] = useState<boolean>(false);

  const [scanIdToDelete, setScanIdToDelete] = useState<string | null>(null);

  const [compareBaseScanInfo, setCompareBaseScanInfo] = useState<{
    scanId: string;
    createdAt: number;
  } | null>(null);

  const [compareToScanInfo, setCompareToScanInfo] = useState<{
    scanId: string;
    createdAt: number;
  } | null>(null);

  const [showCompareToScanSelectionModal, setShowCompareToScanSelectionModal] =
    useState(false);

  if (!node_id || !node_type || !scan_id) {
    throw new Error('Scan id, Node type and Node id are required');
  }

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
      {showCompareToScanSelectionModal && (
        <CompareScanInputModal
          showDialog={showCompareToScanSelectionModal}
          setShowDialog={(open, compareToScanInfo) => {
            if (!open) {
              if (compareToScanInfo) {
                setCompareToScanInfo(compareToScanInfo);
                setShowScanCompareModal(true);
              } else {
                setCompareBaseScanInfo(null);
                setCompareToScanInfo(null);
              }
              setShowCompareToScanSelectionModal(false);
            }
          }}
          nodeId={node_id}
          nodeType={node_type}
          scanType={ScanTypeEnum.CloudComplianceScan}
          baseScanInfo={compareBaseScanInfo!}
        />
      )}
      {showScanCompareModal && (
        <PosturesCloudCompare
          open={showScanCompareModal}
          onOpenChange={setShowScanCompareModal}
          compareInput={{
            baseScanId: compareBaseScanInfo?.scanId ?? '',
            baseScanTime: compareBaseScanInfo?.createdAt ?? 0,
            toScanId: compareToScanInfo?.scanId ?? '',
            toScanTime: compareToScanInfo?.createdAt ?? 0,
          }}
        />
      )}
      <div className="flex items-center gap-x-3">
        <ScanHistoryDropdown
          selectedScan={{
            id: scan_id,
            status: status ?? '',
            timestamp: created_at ?? 0,
          }}
          nodeInfo={{
            nodeId: node_id,
            nodeType: node_type,
            scanType: ScanTypeEnum.CloudComplianceScan,
          }}
          onScanDownloadClick={(scanId) => {
            downloadScan({
              scanId: scanId,
              scanType: UtilsReportFiltersScanTypeEnum.CloudCompliance,
              nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
            });
          }}
          onScanClick={(scanId) => {
            navigate(
              generatePath(`/posture/cloud/scan-results/:nodeType/:scanId`, {
                scanId: encodeURIComponent(scanId),
                nodeType: nodeType,
              }),
              {
                replace: true,
              },
            );
          }}
          onScanDeleteClick={(scanId) => {
            setScanIdToDelete(scanId);
          }}
          onScanCompareClick={({ scanId, createdAt }) => {
            setCompareBaseScanInfo({
              scanId,
              createdAt,
            });
            setShowCompareToScanSelectionModal(true);
          }}
        />

        {scanIdToDelete && (
          <DeleteScanConfirmationModal
            scanId={scanIdToDelete}
            nodeId={node_id}
            nodeType={node_type}
            open={!!scanIdToDelete}
            onOpenChange={(open, status) => {
              if (open) return;
              if (status.success && scanIdToDelete === scan_id) {
                // if deleting current scan Id
                if (status.nextScanId) {
                  navigate(
                    generatePath('./../:scanId', {
                      scanId: encodeURIComponent(status.nextScanId),
                    }),
                    { replace: true },
                  );
                } else {
                  goBack();
                }
              }
              setScanIdToDelete(null);
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
                      setCompareBaseScanInfo({
                        scanId: scan_id,
                        createdAt: created_at,
                      });
                      setShowCompareToScanSelectionModal(true);
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
