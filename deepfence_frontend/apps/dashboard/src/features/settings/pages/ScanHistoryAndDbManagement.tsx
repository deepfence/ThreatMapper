import { capitalize } from 'lodash-es';
import { useEffect, useState } from 'react';
import {
  HiBadgeCheck,
  HiClock,
  HiDatabase,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { Button, FileInput, Listbox, ListboxOption, Modal, Radio } from 'ui-components';

import { getScanResultsApiClient, getSettingsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelBulkDeleteScansRequestScanTypeEnum,
} from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { apiWrapper } from '@/utils/api';

const getStatusesOrSeverityByResource = (resource: string): string[] => {
  const map: { [key: string]: string[] } = {
    vulnerability: ['critical', 'high', 'medium', 'low', 'all'],
    secret: ['critical', 'high', 'medium', 'low', 'all'],
    malware: ['high', 'medium', 'low', 'all'],
    compliance: ['info', 'note', 'pass', 'warn', 'alarm', 'ok', 'skip', 'all'],
  };
  return map[resource];
};
const DURATION: { [k: string]: number } = {
  'Last 1 Day': 1,
  'Last 7 Days': 7,
  'Last 30 Days': 30,
  'Last 60 Days': 60,
  'Last 90 Days': 90,
  'Last 180 Days': 180,
  All: -1,
};

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
    const duration = formData.get('duration')?.toString();
    const severityOrStatus = formData.get('severityOrStatus');
    const scanType = formData
      .get('selectedResource')
      ?.toString() as ModelBulkDeleteScansRequestScanTypeEnum;

    const deleteScanHistoryApi = apiWrapper({
      fn: getScanResultsApiClient().bulkDeleteScansHistory,
    });

    const deleteScanHistoryResponse = await deleteScanHistoryApi({
      modelBulkDeleteScansRequest: {
        scan_type: scanType,
        filters: {
          compare_filter: null,
          contains_filter: {
            filter_in: {
              severity: [severityOrStatus],
              updated_at: [duration],
            },
          },
          order_filter: { order_fields: [] },
          match_filter: { filter_in: {} },
        },
      },
    });
    if (!deleteScanHistoryResponse.ok) {
      if (deleteScanHistoryResponse.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await deleteScanHistoryResponse.error.response.json();
        return {
          deleteSuccess: false,
          message: modelResponse?.message,
        };
      }
      throw deleteScanHistoryResponse.error;
    }

    return {
      deleteSuccess: true,
    };
  } else if (actionType === ActionEnumType.UPLOAD) {
    const uploadApi = apiWrapper({
      fn: getSettingsApiClient().uploadVulnerabilityDatabase,
    });

    const uploadApiResponse = await uploadApi({
      database: formData.get('vulnerabilityDatabase') as Blob,
    });
    if (!uploadApiResponse.ok) {
      if (uploadApiResponse.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await uploadApiResponse.error.response.json();
        return {
          uploadSuccess: false,
          message: modelResponse?.message,
        };
      }
      throw uploadApiResponse.error;
    }
    return {
      uploadSuccess: true,
    };
  }
  return {};
};

const DeleteSuccess = () => {
  return (
    <div className="grid place-items-center p-6">
      <IconContext.Provider
        value={{
          className: 'mb-3 dark:text-green-600 text-green-400 w-[70px] h-[70px]',
        }}
      >
        <HiBadgeCheck />
      </IconContext.Provider>
      <h3 className="mb-4 font-normal text-center text-sm">
        Selected scan history deleted successfully
      </h3>
    </div>
  );
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
    severityOrStatus: string;
    selectedResource: string;
  };
}) => {
  const fetcher = useFetcher<{
    deleteSuccess: boolean;
    message: string;
  }>();

  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      {!fetcher.data?.deleteSuccess ? (
        <div className="grid place-items-center p-6">
          <IconContext.Provider
            value={{
              className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
            }}
          >
            <HiOutlineExclamationCircle />
          </IconContext.Provider>
          <h3 className="mb-4 font-normal text-center text-sm">
            The selected resource scan history will be deleted.
            <br />
            <span>Are you sure you want to delete?</span>
          </h3>

          {fetcher.data?.message ? (
            <p className="text-red-500 text-sm pb-4">{fetcher.data?.message}</p>
          ) : null}

          <div className="flex items-center justify-right gap-4">
            <Button size="xs" onClick={() => setShowDialog(false)} type="button" outline>
              No, Cancel
            </Button>
            <Button
              size="xs"
              color="danger"
              disabled={fetcher.state !== 'idle'}
              loading={fetcher.state !== 'idle'}
              onClick={() => {
                const formData = new FormData();
                formData.append('actionType', ActionEnumType.DELETE);
                formData.append('severityOrStatus', data.severityOrStatus);
                formData.append('selectedResource', data.selectedResource);
                formData.append('duration', data.duration.toString());
                fetcher.submit(formData, {
                  method: 'post',
                });
              }}
            >
              Yes, I&apos;m sure
            </Button>
          </div>
        </div>
      ) : (
        <DeleteSuccess />
      )}
    </Modal>
  );
};
const UploadVulnerabilityDatabase = () => {
  const fetcher = useFetcher();
  const { state } = fetcher;
  return (
    <>
      <div className="mt-6 flex gap-x-2 items-center">
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
          <IconContext.Provider
            value={{
              className: 'text-blue-600 dark:text-blue-400',
            }}
          >
            <HiDatabase />
          </IconContext.Provider>
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white text-base">
          Database Management
        </h3>
      </div>

      <p className="mt-1 text-gray-700 dark:text-gray-100 text-sm">
        You can upload affected database, and scan and check their results
      </p>

      <FileInput
        className="mt-2 min-[200px] max-w-xs"
        label="Please select a file to upload"
        sizing="sm"
        name="vulnerabilityDatabase"
        onChoosen={(e) => e}
      />

      <div className="w-fit mt-4 flex gap-x-4 items-center">
        <Button
          color="primary"
          size="sm"
          type="button"
          className="w-[108px]"
          loading={state !== 'idle'}
          disabled={state !== 'idle'}
        >
          Upload
        </Button>
        {!fetcher.data?.uploadSuccess && fetcher.data?.message ? (
          <p className="text-red-500 text-sm">{fetcher.data?.message}</p>
        ) : null}
      </div>
    </>
  );
};
const ScanHistoryAndDbManagement = () => {
  const [severityOrStatus, setSeverityOrResources] = useState('severity');
  const [selectedResource, setSelectedResource] = useState('vulnerability');
  const [selectedSeveritiesOrStatuses, setSelectedSeveritiesOrStatuses] = useState('all');
  const [duration, setDuration] = useState(1);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (selectedResource === 'compliance') {
      setSelectedSeveritiesOrStatuses('all');
      setSeverityOrResources('status');
    }
  }, [selectedResource]);

  return (
    <SettingsTab value="scan-history-and-db-management">
      <DeleteConfirmationModal
        showDialog={showDeleteDialog}
        setShowDialog={setShowDeleteDialog}
        data={{
          duration,
          severityOrStatus: selectedSeveritiesOrStatuses,
          selectedResource,
        }}
      />
      <div>
        <div className="mt-2 flex gap-x-2 items-center">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
            <IconContext.Provider
              value={{
                className: 'text-blue-600 dark:text-blue-400',
              }}
            >
              <HiClock />
            </IconContext.Provider>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-base">
            Scan History
          </h3>
        </div>

        <p className="mt-1 text-gray-700 dark:text-gray-100 text-sm">
          Choose resource, its
          {severityOrStatus === 'severity' ? ' severity ' : ' status '}
          and scan duration for which you want to delete for scan history
        </p>
        <div className="mt-2 flex gap-x-16">
          <div>
            <h6 className="text-gray-600 dark:text-white text-base font-medium pb-2">
              Choose Resource
            </h6>
            <Radio
              name="severityOrStatus"
              value={selectedResource}
              options={[
                { label: 'Vulnerability', value: 'vulnerability' },
                { label: 'Secret', value: 'secret' },
                { label: 'Malware', value: 'malware' },
                { label: 'Compliance', value: 'compliance' },
              ]}
              onValueChange={(value) => {
                setSelectedResource(value);
                setSeverityOrResources('severity');
              }}
            />
          </div>
          <div>
            <h6 className="text-gray-600 dark:text-white text-base font-medium pb-2">
              Choose
              {severityOrStatus === 'severity' ? ' Severity ' : ' Status '}
            </h6>
            <Radio
              name="severityOrStatus"
              value={selectedSeveritiesOrStatuses}
              options={(getStatusesOrSeverityByResource(selectedResource) ?? []).map(
                (type) => {
                  return { label: capitalize(type), value: type };
                },
              )}
              onValueChange={(value) => {
                setSelectedSeveritiesOrStatuses(value);
              }}
            />
          </div>
          <div className="w-[300px]">
            <h6 className="text-gray-600 dark:text-white text-base font-medium">
              Choose Duration
            </h6>
            <Listbox
              sizing="sm"
              name="duration"
              placeholder="Choose Duration"
              multiple={false}
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
              color="primary"
              size="sm"
              type="button"
              className="mt-4 w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              Submit
            </Button>
          </div>
        </div>
        <UploadVulnerabilityDatabase />
      </div>
    </SettingsTab>
  );
};

export const module = {
  element: <ScanHistoryAndDbManagement />,
  action,
};
