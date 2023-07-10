import { useState } from 'react';
import { generatePath, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button, Card, Tooltip } from 'ui-components';

import { ComplianceScanConfigureForm } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { MalwareScanConfigureForm } from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import { SecretScanConfigureForm } from '@/components/scan-configure-forms/SecretScanConfigureForm';
import { VulnerabilityScanConfigureForm } from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import {
  ComplianceScanNodeTypeEnum,
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { usePageNavigation } from '@/utils/usePageNavigation';

const SelectedAccountComponent = ({
  type,
  accounts,
}: {
  type: string;
  accounts: string[];
}) => {
  return (
    <span className={'text-p4 text-gray-500 dark:text-text-text-and-icon'}>
      {accounts.length > 0 ? `${type} / ${accounts[0]}` : null}
      &nbsp;
      {accounts.length > 1 && (
        <Tooltip
          content={
            <ul>
              {accounts.map((node, index) => {
                return (
                  <li key={node}>
                    <span className="text-p7 dark:text-text-input-value py-2 pr-1">
                      {index + 1}.
                    </span>
                    <span className="text-p7 dark:text-text-input-value">{node}</span>
                  </li>
                );
              })}
            </ul>
          }
          triggerAsChild
        >
          <span className={'text-p7 dark:text-text-input-value'}>
            +{accounts.length - 1} more
          </span>
        </Tooltip>
      )}
    </span>
  );
};

const ScanConfigureForm = () => {
  const { navigate, goBack } = usePageNavigation();
  const { scanType } = useParams() as {
    scanType: string;
  };
  const location = useLocation();
  const [pageState] = useState<unknown>(location.state);
  if (!Array.isArray(pageState) || !pageState.length) {
    return <Navigate to="/onboard/connectors/my-connectors" />;
  }
  const state = pageState as OnboardConnectionNode[];

  let title = '';
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    title = 'vulnerability';
  } else if (scanType === ScanTypeEnum.SecretScan) {
    title = 'secret';
  } else if (scanType === ScanTypeEnum.MalwareScan) {
    title = 'malware';
  } else if (
    scanType === ScanTypeEnum.ComplianceScan ||
    scanType === ScanTypeEnum.CloudComplianceScan
  ) {
    title = 'posture';
  }
  return (
    <>
      <ConnectorHeader
        title={`New ${title} scan`}
        description="Choose from the below options to perform your first scan."
        endComponent={
          <SelectedAccountComponent
            accounts={state.map((node) => node.accountId ?? '')}
            type={state[0].urlType}
          />
        }
      />
      <Card className="p-4">
        {scanType === ScanTypeEnum.VulnerabilityScan && (
          <VulnerabilityScanConfigureForm
            showAdvancedOptions={false}
            data={{
              nodeIds: state.map((node) => node.urlId),
              nodeType: state[0].urlType as VulnerabilityScanNodeTypeEnum,
              images: [],
            }}
            onSuccess={(data) => {
              if (data) {
                const { nodeType, bulkScanId } = data;
                navigate(
                  generatePath(
                    '/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId',
                    {
                      nodeType,
                      scanType: ScanTypeEnum.VulnerabilityScan,
                      bulkScanId,
                    },
                  ),
                );
              }
            }}
          />
        )}
        {scanType === ScanTypeEnum.SecretScan && (
          <SecretScanConfigureForm
            showAdvancedOptions={false}
            data={{
              nodeIds: state.map((node) => node.urlId),
              nodeType: state[0].urlType as SecretScanNodeTypeEnum,
              images: [],
            }}
            onSuccess={(data) => {
              if (data) {
                const { nodeType, bulkScanId } = data;
                navigate(
                  generatePath(
                    '/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId',
                    {
                      nodeType,
                      scanType: ScanTypeEnum.SecretScan,
                      bulkScanId,
                    },
                  ),
                );
              }
            }}
          />
        )}
        {scanType === ScanTypeEnum.MalwareScan && (
          <MalwareScanConfigureForm
            showAdvancedOptions={false}
            data={{
              nodeIds: state.map((node) => node.urlId),
              nodeType: state[0].urlType as MalwareScanNodeTypeEnum,
              images: [],
            }}
            onSuccess={(data) => {
              if (data) {
                const { nodeType, bulkScanId } = data;
                navigate(
                  generatePath(
                    '/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId',
                    {
                      nodeType,
                      scanType: ScanTypeEnum.MalwareScan,
                      bulkScanId,
                    },
                  ),
                );
              }
            }}
          />
        )}
        {(scanType === ScanTypeEnum.ComplianceScan ||
          scanType === ScanTypeEnum.CloudComplianceScan) && (
          <ComplianceScanConfigureForm
            showAdvancedOptions={true}
            data={{
              nodeIds: state.map((node) => node.urlId),
              nodeType: state[0].urlType as ComplianceScanNodeTypeEnum,
            }}
            onSuccess={(data) => {
              if (data) {
                const { nodeType, bulkScanId } = data;
                navigate(
                  generatePath(
                    '/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId',
                    {
                      nodeType,
                      scanType:
                        scanType === ScanTypeEnum.ComplianceScan
                          ? ScanTypeEnum.ComplianceScan
                          : ScanTypeEnum.CloudComplianceScan,
                      bulkScanId,
                    },
                  ),
                );
              }
            }}
          />
        )}
      </Card>

      <div className="flex">
        <Button onClick={goBack} className="mt-12" type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </>
  );
};

export const module = {
  element: <ScanConfigureForm />,
};
