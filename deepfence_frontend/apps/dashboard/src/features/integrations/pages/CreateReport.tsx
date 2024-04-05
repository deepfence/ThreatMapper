import { upperFirst } from 'lodash-es';
import { useState } from 'react';
import { ActionFunctionArgs, useFetcher, useSearchParams } from 'react-router-dom';
import {
  Button,
  Checkbox,
  DateTimeInput,
  Listbox,
  ListboxOption,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalHeader,
} from 'ui-components';

import { getReportsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelGenerateReportReqReportTypeEnum,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
  UtilsReportFiltersSeverityOrCheckTypeEnum,
} from '@/api/generated';
import { SlidingModalHeaderWrapper } from '@/features/common/SlidingModalHeaderWrapper';
import { AdvancedFilter } from '@/features/integrations/components/report-form/AdvanceFilter';
import { CloudComplianceForm } from '@/features/integrations/components/report-form/CloudComplianceForm';
import { CommonForm } from '@/features/integrations/components/report-form/CommonForm';
import { ComplianceForm } from '@/features/integrations/components/report-form/ComplianceForm';
import { ActionEnumType } from '@/features/integrations/pages/IntegrationAdd';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries } from '@/queries';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { getArrayTypeValuesFromFormData } from '@/utils/formData';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const RESOURCES = [
  UtilsReportFiltersScanTypeEnum.Vulnerability,
  UtilsReportFiltersScanTypeEnum.Secret,
  UtilsReportFiltersScanTypeEnum.Malware,
  UtilsReportFiltersScanTypeEnum.Compliance,
  UtilsReportFiltersScanTypeEnum.CloudCompliance,
];
const REPORT_TYPES: { [k: string]: ModelGenerateReportReqReportTypeEnum } = {
  PDF: ModelGenerateReportReqReportTypeEnum.Pdf,
  XLSX: ModelGenerateReportReqReportTypeEnum.Xlsx,
};
export type ActionData = {
  message?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
} | null;
const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  const fromDate = body.fromDate;
  const fromTime = body.fromTime;
  const toDate = body.toDate;
  const toTime = body.toTime;

  const fromTimeStamp =
    fromDate.length && fromTime.length
      ? new Date(`${fromDate}T${fromTime}`).getTime()
      : undefined;

  const toTimeStamp =
    toDate.length && toTime.length
      ? new Date(`${toDate}T${toTime}`).getTime()
      : undefined;

  const reportType = body.downloadType.toString();
  const _reportType: ModelGenerateReportReqReportTypeEnum = REPORT_TYPES[reportType];

  const _resource = body.resource as UtilsReportFiltersScanTypeEnum;

  const _nodeType: UtilsReportFiltersNodeTypeEnum =
    body.nodeType as UtilsReportFiltersNodeTypeEnum;

  const masked = formData.getAll('mask[]');
  const status = formData.getAll('status[]');

  const accountIds = getArrayTypeValuesFromFormData(formData, 'cloudAccountsFilter');
  const severitiesOrCheckTypes = getArrayTypeValuesFromFormData(
    formData,
    'severityOrCheckType',
  );
  const hostIds = getArrayTypeValuesFromFormData(formData, 'hostFilter');
  const containers = getArrayTypeValuesFromFormData(formData, 'containerFilter');
  const containerImages = getArrayTypeValuesFromFormData(formData, 'imageFilter');
  const clusterIds = getArrayTypeValuesFromFormData(formData, 'clusterFilter');

  const _masked: boolean[] = [];
  if (masked.includes('Masked')) {
    _masked.push(true);
  }
  if (masked.includes('Unmasked')) {
    _masked.push(false);
  }

  const advanced_report_filters: {
    masked?: boolean[];
    node_id?: string[];
    host_name?: string[];
    image_name?: string[];
    container_name?: string[];
    pod_name?: string[];
    kubernetes_cluster_name?: string[];
    scan_status?: string[];
  } = {};
  if (accountIds.length > 0) {
    advanced_report_filters.node_id = accountIds as string[];
  }

  if (hostIds.length > 0) {
    advanced_report_filters.host_name = hostIds as string[];
  }

  if (containerImages.length > 0) {
    advanced_report_filters.image_name = containerImages as string[];
  }

  if (containers.length > 0) {
    advanced_report_filters.container_name = containers as string[];
  }

  if (clusterIds.length > 0) {
    advanced_report_filters.kubernetes_cluster_name = clusterIds as string[];
  }

  if (status.length > 0) {
    advanced_report_filters.scan_status = status as string[];
  }

  if (_masked.length > 0) {
    advanced_report_filters.masked = _masked;
  }

  const generateReportApi = apiWrapper({
    fn: getReportsApiClient().generateReport,
  });

  const r = await generateReportApi({
    modelGenerateReportReq: {
      from_timestamp: fromTimeStamp,
      to_timestamp: toTimeStamp,
      filters: {
        advanced_report_filters: advanced_report_filters,
        include_dead_nodes: body.deadNodes === 'on',
        node_type: _nodeType,
        scan_type: _resource,
        severity_or_check_type: (severitiesOrCheckTypes as string[]).map((sev) =>
          sev.toLowerCase(),
        ) as UtilsReportFiltersSeverityOrCheckTypeEnum,
      },

      report_type: _reportType,
    },
  });
  if (!r.ok) {
    if (r.error.response.status === 400) {
      const modelResponse: ApiDocsBadRequestResponse = await r.error.response.json();
      return {
        success: false,
        message: modelResponse.message ?? '',
        fieldErrors: modelResponse.error_fields ?? {},
      };
    } else if (r.error.response.status === 403) {
      const message = await get403Message(r.error);
      return {
        success: false,
        message,
      };
    }
    throw r.error;
  }
  invalidateAllQueries();
  return {
    success: true,
  };
};
const Header = () => {
  return (
    <SlidingModalHeader>
      <SlidingModalHeaderWrapper>Create new report</SlidingModalHeaderWrapper>
    </SlidingModalHeader>
  );
};

const getResourceDisplayValue = (resource: string) => {
  if (resource === UtilsReportFiltersScanTypeEnum.CloudCompliance) {
    return 'Cloud Compliance';
  }
  return resource;
};

const ReportForm = () => {
  const [resource, setResource] = useState('');
  const [provider, setProvider] = useState('');
  const [downloadType, setDownloadType] = useState('');
  const [deadNodes, setIncludeDeadNodes] = useState(false);

  const { navigate } = usePageNavigation();

  const fetcher = useFetcher<ActionData>();
  const { data } = fetcher;
  const fieldErrors = data?.fieldErrors ?? {};

  return (
    <>
      {!data?.success ? (
        <fetcher.Form method="post" className="m-4 overflow-auto">
          <input
            type="text"
            name="_actionType"
            readOnly
            hidden
            value={ActionEnumType.ADD}
          />
          <div className="gap-y-8 grid grid-cols-2 auto-rows-auto gap-x-8">
            <Listbox
              helperText={fieldErrors?.scan_type}
              color={fieldErrors?.scan_type ? 'error' : 'default'}
              variant="underline"
              label="Select Resource"
              value={resource}
              name="resource"
              onChange={(value) => {
                setResource(value);
                setProvider('');
              }}
              getDisplayValue={(item) => {
                return item ? upperFirst(getResourceDisplayValue(item)) : '';
              }}
              placeholder="Select resource"
              required
            >
              {RESOURCES.map((resource) => {
                return (
                  <ListboxOption value={resource} key={resource}>
                    {upperFirst(getResourceDisplayValue(resource))}
                  </ListboxOption>
                );
              })}
            </Listbox>

            {resource === UtilsReportFiltersScanTypeEnum.Compliance ? (
              <ComplianceForm
                setProvider={setProvider}
                provider={provider}
                resource={resource}
              />
            ) : null}

            {resource === UtilsReportFiltersScanTypeEnum.CloudCompliance ? (
              <CloudComplianceForm setProvider={setProvider} provider={provider} />
            ) : null}

            {resource !== UtilsReportFiltersScanTypeEnum.CloudCompliance &&
            resource !== UtilsReportFiltersScanTypeEnum.Compliance ? (
              <CommonForm
                setProvider={setProvider}
                resource={resource}
                provider={provider}
                fieldErrors={fieldErrors}
              />
            ) : null}

            <DateTimeInput
              label="From Date"
              timeInputProps={{
                name: 'fromTime',
                defaultValue: '00:00',
              }}
              dateInputProps={{
                name: 'fromDate',
              }}
              helperText={fieldErrors?.from_timestamp}
              color={fieldErrors?.from_timestamp ? 'error' : 'default'}
            />
            <DateTimeInput
              label="To Date"
              timeInputProps={{
                name: 'toTime',
                defaultValue: '23:59',
              }}
              dateInputProps={{
                name: 'toDate',
              }}
              helperText={fieldErrors?.to_timestamp}
              color={fieldErrors?.to_timestamp ? 'error' : 'default'}
            />

            <Listbox
              helperText={fieldErrors?.report_type}
              color={fieldErrors?.report_type ? 'error' : 'default'}
              variant="underline"
              label="Select Download Type"
              value={downloadType}
              name="downloadType"
              onChange={(value) => {
                setDownloadType(value);
              }}
              placeholder="Download type"
              getDisplayValue={() => {
                return downloadType;
              }}
              required
            >
              {Object.keys(REPORT_TYPES).map((resource) => {
                return (
                  <ListboxOption value={resource} key={resource}>
                    {resource}
                  </ListboxOption>
                );
              })}
            </Listbox>

            <div className="col-span-2 my-5">
              <Checkbox
                label="Include Dead Nodes"
                key="deadNodes"
                name="deadNodes"
                checked={deadNodes}
                onCheckedChange={(checked: boolean) => {
                  setIncludeDeadNodes(checked);
                }}
              />
            </div>
          </div>

          <AdvancedFilter
            provider={provider}
            resourceType={resource}
            deadNodes={deadNodes}
          />

          {data?.message ? (
            <p className="mt-4 text-p7 text-status-error">{data?.message}</p>
          ) : null}

          <div className="mt-14 flex gap-x-2">
            <Button
              size="md"
              color="default"
              type="submit"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
            >
              Create
            </Button>
            <Button
              type="button"
              size="md"
              color="default"
              variant="outline"
              onClick={() => navigate('../')}
            >
              Cancel
            </Button>
          </div>
        </fetcher.Form>
      ) : (
        <SuccessModalContent text="Created successfully" />
      )}
    </>
  );
};
const CreateReport = () => {
  const { navigate } = usePageNavigation();
  const [searchParams] = useSearchParams();

  return (
    <SlidingModal
      open={true}
      onOpenChange={() => {
        navigate(`..?${searchParams.toString()}`);
      }}
      size="l"
    >
      <SlidingModalCloseButton />
      <Header />
      <ReportForm />
    </SlidingModal>
  );
};
export const module = {
  action,
  element: <CreateReport />,
};
