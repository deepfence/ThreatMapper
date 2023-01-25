import cx from 'classnames';
import { FaExclamationTriangle } from 'react-icons/fa';
import { IconContext } from 'react-icons/lib';
import {
  Link,
  LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useParams,
  useRevalidator,
} from 'react-router-dom';
import { useInterval } from 'react-use';

import { complianceScanApiClient, vulnerabilityScanApiClient } from '@/api/api';
import { ModelResponse, ModelScanStatusResp } from '@/api/generated';
import { ScanLoader } from '@/components/ScanLoader';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { ApiError, makeRequest } from '@/utils/api';

export const ScanInProgressError = () => {
  return (
    <>
      <ConnectorHeader
        title={'Scan Error'}
        description={'An error has occured, please retry.'}
      />
      <div className="flex flex-col items-center">
        <IconContext.Provider
          value={{
            className: 'w-[70px] h-[70px] dark:text-gray-400 text-gray-900',
          }}
        >
          <FaExclamationTriangle />
        </IconContext.Provider>
        <p className="text-sm text-red-500 mt-3">
          Opps! An error has occured during your scan, please try again
        </p>

        <Link
          to="/onboard/connectors/my-connectors"
          className={cx(
            `test-sm mt-2`,
            'underline underline-offset-4 bg-transparent text-blue-600 dark:text-blue-500',
          )}
        >
          Try Again
        </Link>
      </div>
    </>
  );
};

const statusScanApiFunctionMap = {
  vulnerability: vulnerabilityScanApiClient().statusVulnerabilityScan,
  compliance: complianceScanApiClient().startComplianceScan,
};

export type ScanStatusLoaderReturnType = {
  error?: string;
  message?: string;
  success?: boolean;
};

export const scanStatusLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<ScanStatusLoaderReturnType> => {
  const scanId = params?.scanId ?? '';
  const scanType = params?.scanType as keyof typeof statusScanApiFunctionMap;
  const r = await makeRequest({
    apiFunction: statusScanApiFunctionMap[scanType],
    apiArgs: [
      {
        scanId,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ScanStatusLoaderReturnType>({});
      if (r.status === 400 || r.status === 500) {
        const modelResponse: ModelResponse = await r.json();
        return error.set({
          message: modelResponse.data + '',
          success: modelResponse.success,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    throw r.value();
  }

  if ((r as ModelScanStatusResp).status === 'COMPLETED') {
    throw redirect(`/onboard/scan/view-summary`, 302);
  }
  return {
    success: true,
    message: (r as ModelScanStatusResp).status,
  };
};

type TextProps = {
  scanningText: string;
  headerText: string;
  subHeaderText: string;
};
type ConfigProps = {
  vulnerability: TextProps;
  secret: TextProps;
  malware: TextProps;
  posture: TextProps;
  alert: TextProps;
};

const configMap: ConfigProps = {
  vulnerability: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  secret: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  malware: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  posture: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  alert: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
};

export const ScanInProgress = () => {
  const params = useParams();
  const loaderData = useLoaderData() as ScanStatusLoaderReturnType;
  const revalidator = useRevalidator();
  const { scanType } = params as { scanType: keyof ConfigProps };

  const textMap = configMap[scanType];

  useInterval(() => {
    if (
      loaderData.success &&
      (loaderData.message === 'STARTING' || loaderData.message === 'IN_PROGRESS')
    ) {
      revalidator.revalidate();
    }
  }, 5000);

  return (
    <>
      <ConnectorHeader title={textMap.headerText} description={textMap.subHeaderText} />
      <ScanLoader text={textMap.scanningText} />
    </>
  );
};
