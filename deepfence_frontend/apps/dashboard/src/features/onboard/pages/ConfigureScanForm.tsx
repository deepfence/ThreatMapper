import { useState } from 'react';
import { generatePath, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button, Tooltip } from 'ui-components';

import {
  MalwareScanActionEnumType,
  MalwareScanConfigureForm,
} from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import {
  ComplianceType,
  PostureScanActionEnumType,
  PostureScanConfigureForm,
} from '@/components/scan-configure-forms/PostureScanConfigureForm';
import {
  SecretScanActionEnumType,
  SecretScanConfigureForm,
} from '@/components/scan-configure-forms/SecretScanConfigureForm';
import {
  VulnerabilityScanActionEnumType,
  VulnerabilityScanConfigureForm,
} from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { NodeType } from '@/features/onboard/pages/ChooseScan';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import { usePageNavigation } from '@/utils/usePageNavigation';

const SelectedAccountComponent = ({
  type,
  accounts,
}: {
  type: string;
  accounts: string[];
}) => {
  return (
    <span className={'text-sm text-gray-600 dark:text-gray-400'}>
      {accounts.length > 0 ? `${type} / ${accounts[0]}` : null}
      &nbsp;
      {accounts.length > 1 && (
        <Tooltip content={accounts.slice(1).join(', ')}>
          <span className={'text-sm text-blue-500 dark:text-blue-400'}>
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
  if (scanType === VulnerabilityScanActionEnumType.SCAN_VULNERABILITY) {
    title = 'Vulnerability';
  } else if (scanType === SecretScanActionEnumType.SCAN_SECRET) {
    title = 'Secret';
  } else if (scanType === MalwareScanActionEnumType.SCAN_MALWARE) {
    title = 'Malware';
  } else if (scanType === PostureScanActionEnumType.SCAN_POSTURE) {
    title = 'Posture';
  }

  return (
    <>
      <ConnectorHeader
        title={`Configure ${title} Scan`}
        description="Choose from the below options to perform your first scan."
        endComponent={
          <SelectedAccountComponent
            accounts={state.map((node) => node.urlId)}
            type={state[0].urlType}
          />
        }
      />
      {scanType === VulnerabilityScanActionEnumType.SCAN_VULNERABILITY && (
        <VulnerabilityScanConfigureForm
          wantAdvanceOptions={false}
          data={{
            nodeIds: state.map((node) => node.urlId),
            nodeType: state[0].urlType as NodeType,
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
      {scanType === SecretScanActionEnumType.SCAN_SECRET && (
        <SecretScanConfigureForm
          wantAdvanceOptions={false}
          data={{
            nodeIds: state.map((node) => node.urlId),
            nodeType: state[0].urlType as NodeType,
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
      {scanType === MalwareScanActionEnumType.SCAN_MALWARE && (
        <MalwareScanConfigureForm
          wantAdvanceOptions={false}
          data={{
            nodeIds: state.map((node) => node.urlId),
            nodeType: state[0].urlType as NodeType,
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
      {scanType === PostureScanActionEnumType.SCAN_POSTURE && (
        <PostureScanConfigureForm
          wantAdvanceOptions={false}
          data={{
            nodeIds: state.map((node) => node.urlId),
            nodeType: state[0].urlType as ComplianceType,
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
                    scanType: 'compliance',
                    bulkScanId,
                  },
                ),
              );
            }
          }}
        />
      )}
      <div className="flex">
        <Button onClick={goBack} size="xs">
          Go Back
        </Button>
      </div>
    </>
  );
};

export const module = {
  element: <ScanConfigureForm />,
};
