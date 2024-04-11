import { useSuspenseQuery } from '@suspensive/react-query';
import { upperFirst } from 'lodash-es';
import { Suspense, useEffect, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import {
  Button,
  FileInput,
  Listbox,
  ListboxOption,
  Modal,
  Radio,
  Separator,
} from 'ui-components';

import { getScanResultsApiClient, getSettingsApiClient } from '@/api/api';
import { ModelBulkDeleteScansRequestScanTypeEnum as ModelBulkDeleteScansRequestScanTypeEnumType } from '@/api/generated';
import {
  ApiDocsBadRequestResponse,
  ModelBulkDeleteScansRequest,
  ModelBulkDeleteScansRequestScanTypeEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ErrorIcon } from '@/components/icons/common/ScanStatuses';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { queries } from '@/queries';
import { invalidateAllQueries } from '@/queries';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

const DURATION: { [k: string]: number } = {
  'Last 1 Day': 86400000,
  'Last 7 Days': 604800000,
  'Last 30 Days': 2592000000,
  'Last 60 Days': 5184000000,
  'Last 90 Days': 7776000000,
  'Last 180 Days': 15552000000,
  All: 0,
};

const files: { [filename: string]: File } = {};

enum ActionEnumType {
  DELETE = 'delete',
  UPLOAD_VULNERABILITY = 'upload_vulnerability',
  UPLOAD_SECRET = 'upload_secret',
  UPLOAD_MALWARE = 'upload_malware',
  UPLOAD_POSTURE = 'upload_posture',
}
export type ActionReturnType = {
  deleteSuccess?: boolean;
  uploadSuccess?: boolean;
  message?: string;
};
const action = async ({ request }: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const actionType = formData.get('actionType');

  if (actionType === ActionEnumType.DELETE) {
    const duration = parseInt(formData.get('duration')?.toString() ?? '0', 10);
    const scanType = formData
      .get('selectedResource')
      ?.toString() as ModelBulkDeleteScansRequestScanTypeEnumType;
    const modelBulkDeleteScansRequest: ModelBulkDeleteScansRequest = {
      scan_type: scanType,
      filters: {
        compare_filter: null,
        contains_filter: { filter_in: {} },
        order_filter: { order_fields: [] },
        match_filter: { filter_in: {} },
      },
    };

    if (duration) {
      modelBulkDeleteScansRequest.filters.compare_filter = [
        {
          field_name: 'updated_at',
          field_value: `${Date.now() - duration}`,
          greater_than: true,
        },
      ];
    }

    const deleteScanHistory = apiWrapper({
      fn: getScanResultsApiClient().bulkDeleteScans,
    });

    const deleteScanHistoryResponse = await deleteScanHistory({
      modelBulkDeleteScansRequest,
    });
    if (!deleteScanHistoryResponse.ok) {
      if (deleteScanHistoryResponse.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await deleteScanHistoryResponse.error.response.json();
        return {
          deleteSuccess: false,
          message: modelResponse?.message,
        };
      } else if (deleteScanHistoryResponse.error.response.status === 403) {
        const message = await get403Message(deleteScanHistoryResponse.error);
        return {
          deleteSuccess: false,
          message,
        };
      }
      throw deleteScanHistoryResponse.error;
    }

    invalidateAllQueries();
    return {
      deleteSuccess: true,
    };
  } else if (
    actionType === ActionEnumType.UPLOAD_VULNERABILITY ||
    actionType === ActionEnumType.UPLOAD_SECRET ||
    actionType === ActionEnumType.UPLOAD_MALWARE ||
    actionType === ActionEnumType.UPLOAD_POSTURE
  ) {
    const uploadDatabaseApi = apiWrapper({
      fn: {
        [ActionEnumType.UPLOAD_VULNERABILITY]:
          getSettingsApiClient().uploadVulnerabilityDatabase,
        [ActionEnumType.UPLOAD_SECRET]: getSettingsApiClient().uploadSecretsRules,
        [ActionEnumType.UPLOAD_MALWARE]: getSettingsApiClient().uploadMalwareRules,
        [ActionEnumType.UPLOAD_POSTURE]: getSettingsApiClient().uploadPostureControls,
      }[actionType],
    });
    const filename = formData.get('database')?.toString() ?? '';
    if (!filename.trim()) {
      return {
        uploadSuccess: false,
        message: 'Please select file to upload',
      };
    }
    const file = files[filename];
    const uploadApiResponse = await uploadDatabaseApi({
      database: file,
    });
    if (!uploadApiResponse.ok) {
      if (
        uploadApiResponse.error.response.status === 400 ||
        uploadApiResponse.error.response.status === 500
      ) {
        const modelResponse: ApiDocsBadRequestResponse =
          await uploadApiResponse.error.response.json();
        return {
          uploadSuccess: false,
          message: modelResponse?.message,
        };
      } else if (uploadApiResponse.error.response.status === 403) {
        const message = await get403Message(uploadApiResponse.error);
        return {
          uploadSuccess: false,
          message,
        };
      }
      throw uploadApiResponse.error;
    }
    invalidateAllQueries();
    return {
      uploadSuccess: true,
    };
  }
  return {};
};

const DeleteConfirmationModal = ({
  showDialog,
  setShowDialog,
  data,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  data: {
    duration: number;
    selectedResource: string;
  };
}) => {
  const fetcher = useFetcher<{
    deleteSuccess: boolean;
    message: string;
  }>();

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.deleteSuccess ? (
          <div className="flex gap-3 items-center text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete scan history
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.deleteSuccess ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
              size="md"
            >
              Cancel
            </Button>
            <Button
              color="error"
              type="button"
              onClick={() => {
                const formData = new FormData();
                formData.append('actionType', ActionEnumType.DELETE);
                formData.append('selectedResource', data.selectedResource);
                formData.append('duration', data.duration.toString());
                fetcher.submit(formData, {
                  method: 'post',
                });
              }}
              size="md"
              disabled={fetcher.state !== 'idle'}
              loading={fetcher.state !== 'idle'}
            >
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.deleteSuccess ? (
        <div className="grid">
          <span>The selected scan history will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Delete requested successfully" />
      )}
    </Modal>
  );
};
const useGetVersion = () => {
  return useSuspenseQuery({
    ...queries.setting.productVersion(),
  });
};
const useGetLicense = () => {
  return useSuspenseQuery({
    ...queries.setting.getThreatMapperLicense(),
  });
};

const useGetLink = (version: string, licenseKey?: string) => {
  const fetchLinks = async () => {
    const threats: {
      data?: { type: string; url: string }[];
      error?: string;
    } = {
      data: [],
    };
    if (!licenseKey) {
      return threats;
    }
    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set('x-license-key', licenseKey);
    try {
      const response = await fetch(
        `https://threat-intel.deepfence.io/threat-intel/listing.json?version=v${version}&product=ThreatMapper`,
        {
          method: 'GET',
          headers: requestHeaders,
        },
      );
      if (!response.ok) {
        threats.error = 'Fail to fetch threat intel feeds and rules';
        return threats;
      }
      const data = (await response.json()) as Record<
        string,
        Record<
          string,
          {
            type: string;
            url: string;
          }[]
        >
      >;
      const links = data.available[`v${version}`];
      const sortMap: { [key: string]: number } = {
        vulnerability: 1,
        secret: 2,
        malware: 3,
        posture: 4,
      };
      threats.data = links
        ?.sort((link1, link2) => sortMap[link1.type] - sortMap[link2.type])
        .map?.((link) => ({ type: link.type, url: link.url }));
    } catch (error) {
      threats.error = 'Fail to fetch threat intel feeds and rules';
    }

    return threats;
  };
  return useSuspenseQuery({
    queryKey: ['threat-intel-feeds'],
    queryFn: fetchLinks,
  });
};

const RuleLinks = () => {
  const { data: product } = useGetVersion();
  const { data: license } = useGetLicense();
  const { data: threats } = useGetLink(product.version, license.key);

  return (
    <>
      <h3 className="py-1 text-p4a text-text-text-and-icon">
        In case the management console is air-gapped, please download the threat intel
        feeds from here and upload them:
      </h3>
      <div className="mt-2 max-w-lg">
        {threats.data ? (
          <div className="flex flex-col gap-y-1">
            {threats.data?.map((link) => {
              return (
                <div key={link.type} className="py-1 text-p7">
                  <div className="flex gap-x-1 text-text-text-and-icon">
                    <div className="w-4 h-4 ">
                      {link.type === 'vulnerability' ? <VulnerabilityIcon /> : null}
                      {link.type === 'secret' ? <SecretsIcon /> : null}
                      {link.type === 'malware' ? <MalwareIcon /> : null}
                      {link.type === 'posture' ? <PostureIcon /> : null}
                    </div>
                    <span className="text-p4">{upperFirst(link.type)}</span>
                  </div>
                  <DFLink
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-text-and-icon text-p4a"
                  >
                    <TruncatedText text={link.url} />
                  </DFLink>
                </div>
              );
            })}
          </div>
        ) : null}

        {threats.error ? (
          <p className="flex items-center gap-x-1 text-status-error text-p7a py-1">
            <div className="h-4 w-4">
              <ErrorIcon />
            </div>
            {threats.error}
          </p>
        ) : null}
      </div>
    </>
  );
};
const SkeletonLinks = () => {
  return (
    <div className="flex flex-col gap-y-4 mt-2">
      <div className="flex h-4 w-[350px] bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="flex h-4 w-[322px] bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="flex h-4 w-[322px] bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="flex h-4 w-[322px] bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
      <div className="flex h-4 w-[322px] bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
    </div>
  );
};
const Database = () => {
  return (
    <>
      <div className="mt-9">
        <h3 className="text-h6 text-text-input-value">Database Management</h3>
      </div>
      <Suspense fallback={<SkeletonLinks />}>
        <RuleLinks />
      </Suspense>
      <UploadVulnerabilityDatabase />
      <UploadSecretDatabase />
      <UploadMalwareDatabase />
      <UploadPostureDatabase />
      <br />
    </>
  );
};
const UploadVulnerabilityDatabase = () => {
  const fetcher = useFetcher<{
    uploadSuccess?: boolean;
    message?: string;
  }>();
  const { state } = fetcher;
  const [databaseFile, setDatabaseFile] = useState<File | null>(null);

  return (
    <>
      <p className="mt-6 text-p5 text-text-text-and-icon">Vulnerability scan feeds</p>
      <div className="flex items-center gap-x-8">
        <FileInput
          className="mt-2 min-[200px] max-w-xs"
          label="Please select a file to upload"
          sizing="sm"
          accept=".gz"
          onChoosen={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              files[file.name] = file;
              setDatabaseFile(file);
            }
          }}
        />

        <div className="w-fit mt-8">
          <div className="flex gap-x-4 items-center">
            <Button
              className="w-[108px]"
              type="button"
              size="sm"
              startIcon={<ArrowLine />}
              loading={state !== 'idle'}
              disabled={state !== 'idle'}
              onClick={() => {
                const formData = new FormData();
                if (!databaseFile) {
                  formData.append('database', '');
                } else {
                  formData.append('database', databaseFile as File);
                }
                formData.append('actionType', ActionEnumType.UPLOAD_VULNERABILITY);
                fetcher.submit(formData, {
                  method: 'post',
                });
              }}
            >
              Upload
            </Button>
            {!fetcher.data?.uploadSuccess && fetcher.data?.message ? (
              <p className="text-status-error text-p7a">{fetcher.data?.message}</p>
            ) : null}
            {fetcher.data?.uploadSuccess ? (
              <p className="text-green-500 text-p7a">Upload successfull</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
const UploadSecretDatabase = () => {
  const fetcher = useFetcher<{
    uploadSuccess?: boolean;
    message?: string;
  }>();
  const { state } = fetcher;
  const [databaseFile, setDatabaseFile] = useState<File | null>(null);
  return (
    <>
      <p className="mt-8 text-p5 text-text-text-and-icon">Secret scan rules</p>
      <div className="flex items-center gap-x-8">
        <FileInput
          className="mt-2 min-[200px] max-w-xs"
          label="Please select a file to upload"
          sizing="sm"
          accept=".gz"
          onChoosen={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              files[file.name] = file;
              setDatabaseFile(file);
            }
          }}
        />

        <div className="w-fit mt-8">
          <div className="flex gap-x-4 items-center">
            <Button
              className="w-[108px]"
              type="button"
              size="sm"
              startIcon={<ArrowLine />}
              loading={state !== 'idle'}
              disabled={state !== 'idle'}
              onClick={() => {
                const formData = new FormData();
                if (!databaseFile) {
                  formData.append('database', '');
                } else {
                  formData.append('database', databaseFile as File);
                }
                formData.append('actionType', ActionEnumType.UPLOAD_SECRET);
                fetcher.submit(formData, {
                  method: 'post',
                });
              }}
            >
              Upload
            </Button>
            {!fetcher.data?.uploadSuccess && fetcher.data?.message ? (
              <p className="text-status-error text-p7a">{fetcher.data?.message}</p>
            ) : null}
            {fetcher.data?.uploadSuccess ? (
              <p className="text-p7a text-status-success">Upload successfull</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
const UploadMalwareDatabase = () => {
  const fetcher = useFetcher<{
    uploadSuccess?: boolean;
    message?: string;
  }>();
  const { state } = fetcher;
  const [databaseFile, setDatabaseFile] = useState<File | null>(null);

  return (
    <>
      <p className="mt-8 text-p5 text-text-text-and-icon">Malware scan rules</p>
      <div className="flex items-center gap-x-8">
        <FileInput
          className="mt-2 min-[200px] max-w-xs"
          label="Please select a file to upload"
          sizing="sm"
          accept=".gz"
          onChoosen={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              files[file.name] = file;
              setDatabaseFile(file);
            }
          }}
        />

        <div className="w-fit mt-8">
          <div className="flex gap-x-4 items-center">
            <Button
              className="w-[108px]"
              type="button"
              size="sm"
              startIcon={<ArrowLine />}
              loading={state !== 'idle'}
              disabled={state !== 'idle'}
              onClick={() => {
                const formData = new FormData();
                if (!databaseFile) {
                  formData.append('database', '');
                } else {
                  formData.append('database', databaseFile as File);
                }
                formData.append('actionType', ActionEnumType.UPLOAD_MALWARE);
                fetcher.submit(formData, {
                  method: 'post',
                });
              }}
            >
              Upload
            </Button>
            {!fetcher.data?.uploadSuccess && fetcher.data?.message ? (
              <p className="text-status-error text-p7a">{fetcher.data?.message}</p>
            ) : null}
            {fetcher.data?.uploadSuccess ? (
              <p className="text-p7a text-status-success">Upload successfull</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
const UploadPostureDatabase = () => {
  const fetcher = useFetcher<{
    uploadSuccess?: boolean;
    message?: string;
  }>();
  const { state } = fetcher;
  const [databaseFile, setDatabaseFile] = useState<File | null>(null);

  return (
    <>
      <p className="mt-8 text-p5 text-text-text-and-icon">Posture scan controls</p>
      <div className="flex items-center gap-x-8">
        <FileInput
          className="mt-2 min-[200px] max-w-xs"
          label="Please select a file to upload"
          sizing="sm"
          accept=".gz"
          onChoosen={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              files[file.name] = file;
              setDatabaseFile(file);
            }
          }}
        />

        <div className="w-fit mt-8">
          <div className="flex gap-x-4 items-center">
            <Button
              className="w-[108px]"
              type="button"
              size="sm"
              startIcon={<ArrowLine />}
              loading={state !== 'idle'}
              disabled={state !== 'idle'}
              onClick={() => {
                const formData = new FormData();
                if (!databaseFile) {
                  formData.append('database', '');
                } else {
                  formData.append('database', databaseFile as File);
                }
                formData.append('actionType', ActionEnumType.UPLOAD_POSTURE);
                fetcher.submit(formData, {
                  method: 'post',
                });
              }}
            >
              Upload
            </Button>
            {!fetcher.data?.uploadSuccess && fetcher.data?.message ? (
              <p className="text-status-error text-p7a">{fetcher.data?.message}</p>
            ) : null}
            {fetcher.data?.uploadSuccess ? (
              <p className="text-p7a text-status-success">Upload successfull</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

const resources: {
  label: string;
  value: ModelBulkDeleteScansRequestScanTypeEnum;
}[] = [
  {
    label: 'Vulnerability',
    value: ModelBulkDeleteScansRequestScanTypeEnum.Vulnerability,
  },
  {
    label: 'Secret',
    value: ModelBulkDeleteScansRequestScanTypeEnum.Secret,
  },
  {
    label: 'Malware',
    value: ModelBulkDeleteScansRequestScanTypeEnum.Malware,
  },
  {
    label: 'Posture',
    value: ModelBulkDeleteScansRequestScanTypeEnum.Compliance,
  },
  {
    label: 'Cloud Posture',
    value: ModelBulkDeleteScansRequestScanTypeEnum.CloudCompliance,
  },
];

const ScanHistoryAndDbManagement = () => {
  const [, setSeverityOrResources] = useState('severity');
  const [selectedResource, setSelectedResource] = useState<string>(
    ModelBulkDeleteScansRequestScanTypeEnumType.Vulnerability,
  );
  const [duration, setDuration] = useState<number>(DURATION['Last 1 Day']);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (selectedResource === ModelBulkDeleteScansRequestScanTypeEnumType.Compliance) {
      setSeverityOrResources('status');
    }
  }, [selectedResource]);

  return (
    <>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          setShowDialog={setShowDeleteDialog}
          data={{
            duration,
            selectedResource,
          }}
        />
      )}
      <div className="mt-2">
        <h3 className="text-h6 text-text-input-value">Scan History</h3>
      </div>

      <p className="mt-2 text-p4 text-text-text-and-icon">
        Please specify the resource and duration you would like to delete from the scan
        history.
      </p>
      <div className="mt-2 flex flex-col">
        <h6 className="text-p3 text-text-input-value pb-[10px]">Choose resource</h6>
        <Radio
          direction="row"
          name="severityOrStatus"
          value={selectedResource}
          options={resources}
          onValueChange={(value) => {
            setSelectedResource(value);
            setSeverityOrResources('severity');
          }}
        />
      </div>
      <div className="w-[300px] mt-6">
        <Listbox
          label="Choose duration"
          name="duration"
          value={duration}
          onChange={(value) => {
            setDuration(value);
          }}
          getDisplayValue={(item) => {
            for (const [key, value] of Object.entries(DURATION)) {
              if (value == item) {
                return key;
              }
            }
            return 'Last 1 Day';
          }}
        >
          {Object.keys(DURATION).map((key) => {
            return (
              <ListboxOption key={key} value={DURATION[key]}>
                {key}
              </ListboxOption>
            );
          })}
        </Listbox>
        <Button
          type="button"
          className="mt-4 w-full"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
        >
          Submit
        </Button>
      </div>
      <Separator className="mt-6 bg-bg-grid-border h-px w-full" />
      <Database />
    </>
  );
};

export const module = {
  element: <ScanHistoryAndDbManagement />,
  action,
};
