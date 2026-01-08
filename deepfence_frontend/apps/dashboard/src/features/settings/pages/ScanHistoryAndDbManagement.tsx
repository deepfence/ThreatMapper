import { useSuspenseQuery } from '@suspensive/react-query';
import { upperFirst } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { Button, FileInput, Modal, Radio, Separator, TextInput } from 'ui-components';

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
import { formatMilliseconds } from '@/utils/date';

const millisecondsOf1Day = 86400000;

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
    const scanPeriodOption = formData.get('scanPeriodOption')?.toString();
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
          field_value: `${Date.now() - duration * millisecondsOf1Day}`,
          greater_than: scanPeriodOption === 'last',
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
  scanPeriodOption,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  data: {
    duration: number;
    selectedResource: string;
  };
  scanPeriodOption: 'older' | 'last' | 'all';
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
                formData.append('scanPeriodOption', scanPeriodOption);
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

const useGetLink = (version: string) => {
  const THREAT_INTEL_BASE_URL = 'https://artifacts.threatmapper.org/threat-intel';

  const getThreatIntelURL = (type: string) => {
    if (type === 'vulnerability') {
      return `${THREAT_INTEL_BASE_URL}/${type}/v6/${type}_v${version}.tar.gz`;
    }
    return `${THREAT_INTEL_BASE_URL}/${type}/${type}_v${version}.tar.gz`;
  };

  const fetchLinks = async () => {
    const threats: {
      data?: { type: string; url: string }[];
      error?: string;
    } = {
      data: [],
    };

    // Directly construct URLs without fetching listing.json
    const types = ['vulnerability', 'secret', 'malware', 'posture'];
    threats.data = types.map((type) => ({
      type,
      url: getThreatIntelURL(type),
    }));

    return threats;
  };
  return useSuspenseQuery({
    queryKey: ['threat-intel-feeds', version],
    queryFn: fetchLinks,
  });
};

const RuleLinks = () => {
  const { data: product } = useGetVersion();
  const { data: threats } = useGetLink(product.version);

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
        <h3 className="text-h6 text-text-input-value">Threat intel</h3>
      </div>
      <LastUpdated />
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
  const [scanPeriodOption, setScanPeriodOption] = useState<'older' | 'last' | 'all'>(
    'older',
  );
  const [selectedResource, setSelectedResource] = useState<string>(
    ModelBulkDeleteScansRequestScanTypeEnumType.Vulnerability,
  );
  const [duration, setDuration] = useState({
    lastDuration: 1,
    olderDuration: 1,
    allDuration: 0,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (selectedResource === ModelBulkDeleteScansRequestScanTypeEnumType.Compliance) {
      setSeverityOrResources('status');
    }
  }, [selectedResource]);

  const selectedDuration = useMemo(() => {
    if (scanPeriodOption === 'older') {
      return duration.olderDuration;
    } else if (scanPeriodOption === 'last') {
      return duration.lastDuration;
    }
    return duration.allDuration;
  }, [duration, scanPeriodOption]);

  return (
    <>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          setShowDialog={setShowDeleteDialog}
          data={{
            duration: selectedDuration,
            selectedResource,
          }}
          scanPeriodOption={scanPeriodOption}
        />
      )}
      <div className="mt-2">
        <h3 className="text-h6 text-text-input-value">Delete Scan History</h3>
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
      <div className="mt-6">
        <div className="mt-2">
          <h3 className="text-h6 text-text-input-value">Scan Period</h3>
        </div>
        <div className="my-2 flex text-p4 items-center dark:text-text-input-value text-text-text-and-icon">
          <Radio
            value={scanPeriodOption}
            name="scanPeriodOption"
            options={[
              {
                label: '',
                value: 'older',
              },
            ]}
            onValueChange={() => {
              setScanPeriodOption('older');
              setDuration({
                lastDuration: 1,
                olderDuration: 1,
                allDuration: 0,
              });
            }}
          />
          <span>Older than</span>
          <div className="w-[60px] mx-2">
            <TextInput
              type="number"
              name="duration"
              min={1}
              value={duration.olderDuration}
              onChange={(e) => {
                setDuration({
                  lastDuration: 1,
                  olderDuration: parseInt(e.target.value.trim(), 10),
                  allDuration: 0,
                });
              }}
            />
          </div>
          <span>days</span>
        </div>
        <div className="my-2 flex text-p4 items-center dark:text-text-input-value text-text-text-and-icon">
          <Radio
            value={scanPeriodOption}
            name="scanPeriodOption"
            options={[
              {
                label: '',
                value: 'last',
              },
            ]}
            onValueChange={() => {
              setScanPeriodOption('last');
              setDuration({
                lastDuration: 1,
                olderDuration: 1,
                allDuration: 0,
              });
            }}
          />
          <span>Last</span>
          <div className="w-[60px] mx-2">
            <TextInput
              type="number"
              name="duration"
              min={1}
              value={duration.lastDuration}
              onChange={(e) => {
                setDuration({
                  lastDuration: parseInt(e.target.value.trim(), 10),
                  olderDuration: 1,
                  allDuration: 0,
                });
              }}
            />
          </div>
          <span>days</span>
        </div>
        <div className="my-2 flex text-p4 items-center dark:text-text-input-value text-text-text-and-icon">
          <Radio
            value={scanPeriodOption}
            name="scanPeriodOption"
            options={[
              {
                label: '',
                value: 'all',
              },
            ]}
            onValueChange={() => {
              setScanPeriodOption('all');
              setDuration({
                lastDuration: 1,
                olderDuration: 1,
                allDuration: 0,
              });
            }}
          />
          <span>All</span>
        </div>

        <Button
          type="button"
          className="mt-4 w-[240px]"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isNaN(duration.olderDuration) || isNaN(duration.lastDuration)}
        >
          Submit
        </Button>
      </div>
      <Separator className="mt-6 bg-bg-grid-border h-px w-full" />
      <Database />
    </>
  );
};

const useDatabaseInfo = () => {
  const { data } = useSuspenseQuery({
    ...queries.setting.getDatabaseInfo(),
  });
  return data;
};

const LastUpdatedContent = () => {
  const { data } = useDatabaseInfo();

  return (
    <div className="mt-2 mb-4">
      <h6 className="text-t1 text-text-input-value">Last Updated</h6>
      <div className="text-p4 text-text-text-and-icon">
        <span>Vulnerability feeds: </span>
        <span>
          {data?.vulnerability_db_updated_at
            ? formatMilliseconds(data.vulnerability_db_updated_at)
            : 'Unknown'}
        </span>
      </div>
      <div className="text-p4 text-text-text-and-icon">
        <span>Secret feeds: </span>
        <span>
          {data?.secrets_rules_updated_at
            ? formatMilliseconds(data.secrets_rules_updated_at)
            : 'Unknown'}
        </span>
      </div>
      <div className="text-p4 text-text-text-and-icon">
        <span>Malware feeds: </span>
        <span>
          {data?.malware_rules_updated_at
            ? formatMilliseconds(data.malware_rules_updated_at)
            : 'Unknown'}
        </span>
      </div>
      <div className="text-p4 text-text-text-and-icon">
        <span>Posture controls feeds: </span>
        <span>
          {data?.posture_controls_updated_at
            ? formatMilliseconds(data.posture_controls_updated_at)
            : 'Unknown'}
        </span>
      </div>
    </div>
  );
};

const LastUpdated = () => {
  return (
    <Suspense fallback={null}>
      <LastUpdatedContent />
    </Suspense>
  );
};

export const module = {
  element: <ScanHistoryAndDbManagement />,
  action,
};
