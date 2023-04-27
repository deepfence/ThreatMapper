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
    <span className={'text-sm text-gray-500 dark:text-gray-400'}>
      {accounts.length > 0 ? `${type} / ${accounts[0]}` : null}
      &nbsp;
      {accounts.length > 1 && (
        <Tooltip
          content={
            <ul>
              {accounts.map((node, index) => {
                return (
                  <li key={node}>
                    <span className="text-gray-400 py-2 pr-1 font-semibold">
                      {index + 1}.
                    </span>
                    <span className="text-gray-300">{node}</span>
                  </li>
                );
              })}
            </ul>
          }
          triggerAsChild
        >
          <span className={'text-sm text-gray-600 dark:text-gray-300'}>
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
    title = 'Vulnerability';
  } else if (scanType === ScanTypeEnum.SecretScan) {
    title = 'Secret';
  } else if (scanType === ScanTypeEnum.MalwareScan) {
    title = 'Malware';
  } else if (
    scanType === ScanTypeEnum.ComplianceScan ||
    scanType === ScanTypeEnum.CloudComplianceScan
  ) {
    title = 'Posture';
  }

  return (
    <>
      <ConnectorHeader
        title={`Configure ${title} Scan`}
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
                      scanType: 'vulnerability',
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
                      scanType: 'secret',
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
                      scanType: 'malware',
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
            showAdvancedOptions={false}
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
                      scanType: 'compliance', // TODO: change this compliance and cloud compliance
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
        <Button onClick={goBack} size="xs" className="mt-12" type="button">
          Go Back
        </Button>
      </div>
    </>
  );
};

export const module = {
  element: <ScanConfigureForm />,
};
