import { useEffect, useState } from 'react';
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
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
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
  UPLOAD = 'upload',
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
  } else if (actionType === ActionEnumType.UPLOAD) {
    const uploadVulnerabilityDatabase = apiWrapper({
      fn: getSettingsApiClient().uploadVulnerabilityDatabase,
    });
    const filename = formData.get('vulnerabilityDatabase')?.toString() ?? '';
    const file = files[filename];
    const uploadApiResponse = await uploadVulnerabilityDatabase({
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
          <div className="flex gap-3 items-center dark:text-status-error">
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
            <p className="mt-2 text-p7 dark:text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Delete requested successfully" />
      )}
    </Modal>
  );
};
const UploadVulnerabilityDatabase = () => {
  const fetcher = useFetcher<{
    uploadSuccess?: boolean;
    message?: string;
  }>();
  const { state } = fetcher;
  const [vulnerabilityDatabaseFile, setVulnerabilityDatabaseFile] = useState<File | null>(
    null,
  );

  return (
    <>
      <div className="mt-9">
        <h3 className="text-h6 dark:text-text-input-value">Database management</h3>
      </div>

      <p className="mt-4 text-p4 dark:text-text-text-and-icon">
        You can upload affected database, and scan and check their results
      </p>
      <FileInput
        className="mt-2 min-[200px] max-w-xs"
        label="Please select a file to upload"
        sizing="md"
        accept="application/tar+gzip"
        onChoosen={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            files[file.name] = file;
            setVulnerabilityDatabaseFile(file);
          }
        }}
      />

      <div className="w-fit mt-6">
        <div className="flex gap-x-4 items-center">
          <Button
            className="w-[108px]"
            type="button"
            loading={state !== 'idle'}
            disabled={state !== 'idle'}
            onClick={() => {
              const formData = new FormData();
              formData.append('vulnerabilityDatabase', vulnerabilityDatabaseFile as File);
              formData.append('actionType', ActionEnumType.UPLOAD);
              fetcher.submit(formData, {
                method: 'post',
              });
            }}
          >
            Upload
          </Button>
          {!fetcher.data?.uploadSuccess && fetcher.data?.message ? (
            <p className="dark:text-status-error text-p7">{fetcher.data?.message}</p>
          ) : null}
          {fetcher.data?.uploadSuccess ? (
            <p className="text-green-500 text-sm">Upload successfull</p>
          ) : null}
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
    label: 'Compliance',
    value: ModelBulkDeleteScansRequestScanTypeEnum.Compliance,
  },
  {
    label: 'Cloud Compliance',
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
        <h3 className="text-h6 dark:text-text-input-value">Scan History</h3>
      </div>

      <p className="mt-4 text-p4 dark:text-text-text-and-icon">
        Please specify the resource and duration you would like to delete from the scan
        history.
      </p>
      <div className="mt-4 flex flex-col">
        <h6 className="text-p3 text-text-text-and-icon dark:text-text-text-and-icon pb-[10px]">
          Choose resource
        </h6>
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
          onClick={() => setShowDeleteDialog(true)}
        >
          Submit
        </Button>
      </div>
      <Separator className="mt-6 dark:bg-bg-grid-border h-px w-full" />
      <UploadVulnerabilityDatabase />
    </>
  );
};

export const module = {
  element: <ScanHistoryAndDbManagement />,
  action,
};
