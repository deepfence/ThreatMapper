import { useState } from 'react';
import { generatePath, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button, Card, Tooltip } from 'ui-components';

import { ComplianceScanConfigureForm } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import {
  MalwareScanConfigureForm,
  MalwareScanConfigureFormProps,
} from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import {
  SecretScanConfigureForm,
  SecretScanConfigureFormProps,
} from '@/components/scan-configure-forms/SecretScanConfigureForm';
import {
  VulnerabilityScanConfigureForm,
  VulnerabilityScanConfigureFormProps,
} from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';
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
    <span className={'text-p4 text-text-text-and-icon'}>
      {accounts.length > 0 ? `${type} / ${accounts[0]}` : null}
      &nbsp;
      {accounts.length > 1 && (
        <Tooltip
          content={
            <ul>
              {accounts.map((node, index) => {
                return (
                  <li
                    key={node}
                    className="text-p7 dark:text-text-input-value text-text-text-inverse"
                  >
                    <span className="py-2 pr-1">{index + 1}.</span>
                    <span className="">{node}</span>
                  </li>
                );
              })}
            </ul>
          }
          triggerAsChild
        >
          <span className={'text-p7 cursor-pointer'}>+{accounts.length - 1} more</span>
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
            showScheduleScanOptions={false}
            data={
              {
                nodes: state.map((node) => {
                  return {
                    nodeId: node.urlId,
                    nodeType: state[0].urlType as VulnerabilityScanNodeTypeEnum,
                  };
                }),
                images: [],
              } as VulnerabilityScanConfigureFormProps['data']
            }
            onSuccess={(data) => {
              if (data) {
                const { nodeType, bulkScanId } = data;
                navigate(
                  generatePath(
                    '/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId',
                    {
                      nodeType,
                      scanType: ScanTypeEnum.VulnerabilityScan,
                      bulkScanId: encodeURIComponent(bulkScanId),
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
            showScheduleScanOptions={false}
            data={
              {
                nodes: state.map((node) => {
                  return {
                    nodeId: node.urlId,
                    nodeType: state[0].urlType as SecretScanNodeTypeEnum,
                  };
                }),
                images: [],
              } as SecretScanConfigureFormProps['data']
            }
            onSuccess={(data) => {
              if (data) {
                const { nodeType, bulkScanId } = data;
                navigate(
                  generatePath(
                    '/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId',
                    {
                      nodeType,
                      scanType: ScanTypeEnum.SecretScan,
                      bulkScanId: encodeURIComponent(bulkScanId),
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
            showScheduleScanOptions={false}
            data={
              {
                nodes: state.map((node) => {
                  return {
                    nodeId: node.urlId,
                    nodeType: state[0].urlType as MalwareScanNodeTypeEnum,
                  };
                }),
                images: [],
              } as MalwareScanConfigureFormProps['data']
            }
            onSuccess={(data) => {
              if (data) {
                const { nodeType, bulkScanId } = data;
                navigate(
                  generatePath(
                    '/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId',
                    {
                      nodeType,
                      scanType: ScanTypeEnum.MalwareScan,
                      bulkScanId: encodeURIComponent(bulkScanId),
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
            showScheduleScanOptions={false}
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
                      bulkScanId: encodeURIComponent(bulkScanId),
                    },
                  ),
                );
              }
            }}
          />
        )}
      </Card>

      <div className="mt-8 flex items-center sticky bottom-0 py-4 bg-bg-page">
        <Button onClick={goBack} type="button" variant="outline" size="md">
          Cancel
        </Button>
      </div>
    </>
  );
};

export const module = {
  element: <ScanConfigureForm />,
};
