import { useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Checkbox,
  Listbox,
  ListboxOption,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalHeader,
  TextInput,
} from 'ui-components';

import { getReportsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelGenerateReportReqDurationEnum,
  ModelGenerateReportReqReportTypeEnum,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
  UtilsReportFiltersSeverityOrCheckTypeEnum,
} from '@/api/generated';
import { AdvancedFilter } from '@/features/integrations/components/report-form/AdvanceFilter';
import { CloudComplianceForm } from '@/features/integrations/components/report-form/CloudComplianceForm';
import { CommonForm } from '@/features/integrations/components/report-form/CommonForm';
import { ComplianceForm } from '@/features/integrations/components/report-form/ComplianceForm';
import { ActionEnumType } from '@/features/integrations/pages/IntegrationAdd';
import { invalidateAllQueries } from '@/queries';
import { apiWrapper } from '@/utils/api';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const DURATION: { [k: string]: ModelGenerateReportReqDurationEnum } = {
  'Last 1 Day': ModelGenerateReportReqDurationEnum.NUMBER_1,
  'Last 7 Days': ModelGenerateReportReqDurationEnum.NUMBER_7,
  'Last 30 Days': ModelGenerateReportReqDurationEnum.NUMBER_30,
  'Last 60 Days': ModelGenerateReportReqDurationEnum.NUMBER_60,
  'Last 90 Days': ModelGenerateReportReqDurationEnum.NUMBER_90,
  'Last 180 Days': ModelGenerateReportReqDurationEnum.NUMBER_180,
  'All Documents': 0 as ModelGenerateReportReqDurationEnum,
};
export type ActionData = {
  message?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
} | null;
const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const severity = formData.getAll('severity[]');
  const body = Object.fromEntries(formData);

  const duration = body.duration as keyof typeof DURATION;

  const reportType =
    body.downloadType as keyof typeof ModelGenerateReportReqReportTypeEnum;
  const _reportType: ModelGenerateReportReqReportTypeEnum =
    ModelGenerateReportReqReportTypeEnum[reportType];

  const resource = body.resource as keyof typeof UtilsReportFiltersScanTypeEnum;
  const _resource: UtilsReportFiltersScanTypeEnum =
    UtilsReportFiltersScanTypeEnum[resource];

  let nodeType = body.nodeType as keyof typeof UtilsReportFiltersNodeTypeEnum;
  if (nodeType.toString() === 'Kubernetes') {
    nodeType = 'Cluster';
  }
  const _nodeType: UtilsReportFiltersNodeTypeEnum =
    UtilsReportFiltersNodeTypeEnum[nodeType];

  const masked = formData.getAll('mask[]');
  const status = formData.getAll('status[]');
  const accountIds = formData.getAll('accountIds[]');
  const interval = formData.get('interval'); // send this when backend is ready to support

  // host filter
  const selectedHostLength = Number(formData.get('selectedHostLength'));
  const hostIds = [];
  if (selectedHostLength > 0) {
    for (let i = 0; i < selectedHostLength; i++) {
      hostIds.push(formData.get(`hostFilter[${i}]`) as string);
    }
  }

  // container filter
  const selectedContainerLength = Number(formData.get('selectedContainerLength'));
  const containers = [];
  if (selectedContainerLength > 0) {
    for (let i = 0; i < selectedContainerLength; i++) {
      containers.push(formData.get(`containerFilter[${i}]`) as string);
    }
  }

  // image filter
  const selectedImageLength = Number(formData.get('selectedImageLength'));
  const containerImages = [];
  if (selectedImageLength > 0) {
    for (let i = 0; i < selectedImageLength; i++) {
      containerImages.push(formData.get(`imageFilter[${i}]`) as string);
    }
  }

  // cluster filter
  const selectedClusterLength = Number(formData.get('selectedClusterLength'));
  const clusterIds = [];
  if (selectedClusterLength > 0) {
    for (let i = 0; i < selectedClusterLength; i++) {
      clusterIds.push(formData.get(`clusterFilter[${i}]`) as string);
    }
  }

  const _masked: boolean[] = [];
  if (masked.includes('Masked')) {
    _masked.push(true);
  }
  if (masked.includes('Unmasked')) {
    _masked.push(false);
  }

  const advanced_report_filters: {
    masked?: boolean[];
    account_id?: string[];
    host_name?: string[];
    image_name?: string[];
    container_name?: string[];
    pod_name?: string[];
    kubernetes_cluster_name?: string[];
    scan_status?: string[];
  } = {};
  if (accountIds.length > 0) {
    advanced_report_filters.account_id = accountIds as string[];
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
      duration: DURATION[duration],
      filters: {
        advanced_report_filters: advanced_report_filters,
        include_dead_nodes: body.deadNodes === 'on',
        node_type: _nodeType,
        scan_type: _resource,
        severity_or_check_type: (severity as string[]).map((sev) =>
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
    }
  }

  toast('Generate Report has started');
  invalidateAllQueries();
  return {
    success: true,
  };
};
const Header = () => {
  return (
    <SlidingModalHeader>
      <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-breadcrumb-bar">
        Create new report
      </div>
    </SlidingModalHeader>
  );
};
const ReportForm = () => {
  const [resource, setResource] = useState('');
  const [provider, setProvider] = useState('');
  const [duration, setDuration] = useState('');
  const [downloadType, setDownloadType] = useState('');
  const [deadNodes, setIncludeDeadNodes] = useState(false);

  const { navigate } = usePageNavigation();

  const fetcher = useFetcher<ActionData>();
  const { data } = fetcher;
  const fieldErrors = data?.fieldErrors ?? {};

  return (
    <fetcher.Form method="post" className="m-4">
      <input type="text" name="_actionType" readOnly hidden value={ActionEnumType.ADD} />
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
            return (
              Object.keys(UtilsReportFiltersScanTypeEnum).find(
                (person) => person === item,
              ) ?? ''
            );
          }}
          placeholder="Select resource"
        >
          {Object.keys(UtilsReportFiltersScanTypeEnum).map((resource) => {
            return (
              <ListboxOption value={resource} key={resource}>
                {resource}
              </ListboxOption>
            );
          })}
        </Listbox>

        {resource === 'Compliance' ? (
          <ComplianceForm
            setProvider={setProvider}
            provider={provider}
            resource={resource}
          />
        ) : null}

        {resource === 'CloudCompliance' ? (
          <CloudComplianceForm setProvider={setProvider} provider={provider} />
        ) : null}

        {resource !== 'CloudCompliance' && resource !== 'Compliance' ? (
          <CommonForm
            setProvider={setProvider}
            resource={resource}
            provider={provider}
            fieldErrors={fieldErrors}
          />
        ) : null}

        <Listbox
          variant="underline"
          label="Select Duration"
          value={duration}
          name="duration"
          onChange={(value) => {
            setDuration(value);
          }}
          placeholder="Select duration"
          getDisplayValue={(item) => {
            return Object.keys(DURATION).find((person) => person === item) ?? '';
          }}
        >
          {Object.keys(DURATION).map((resource) => {
            return (
              <ListboxOption value={resource} key={resource}>
                {resource}
              </ListboxOption>
            );
          })}
        </Listbox>

        <TextInput
          className="w-full"
          label={'Schedule Interval In Days'}
          type={'text'}
          sizing="md"
          name={'interval'}
          placeholder={'interval'}
          helperText="Maximum upto 180 days supported"
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
          getDisplayValue={(item) => {
            return (
              Object.keys(ModelGenerateReportReqReportTypeEnum).find(
                (person) => person === item,
              ) ?? ''
            );
          }}
        >
          {Object.keys(ModelGenerateReportReqReportTypeEnum).map((resource) => {
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

      <AdvancedFilter provider={provider} resourceType={resource} />

      <div className="mt-14 flex gap-x-2">
        <Button size="md" color="default" type="submit">
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
  );
};
const CreateReport = () => {
  const { navigate } = usePageNavigation();

  return (
    <SlidingModal
      open={true}
      onOpenChange={() => {
        navigate(`..`);
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
