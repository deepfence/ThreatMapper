import { useState } from 'react';
import { HiChevronRight } from 'react-icons/hi';
import { Form } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  Select,
  SelectItem,
  Switch,
  TextInput,
} from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';

const getProviderNodeList = (nodeType: string) => {
  switch (nodeType) {
    case 'AWS':
      return complianceType.aws;
    case 'Google':
      return complianceType.gcp;
    case 'Azure':
      return complianceType.azure;
    case 'Linux':
      return complianceType.host;
    default:
      console.error('Provider type should be match');
      return [];
  }
};
const ComplianceForm = () => {
  const [provider, setProvider] = useState('');
  const [benchmarkType, setBenchmarkType] = useState('');

  return (
    <div className="flex flex-col gap-y-4">
      <Select
        label="Select Provider"
        value={provider}
        name="provider"
        onChange={(value) => {
          setProvider(value);
        }}
        placeholder="Select Provider"
        sizing="xs"
      >
        {['AWS', 'Google', 'Azure', 'Linux'].map((resource) => {
          return (
            <SelectItem value={resource} key={resource}>
              {resource}
            </SelectItem>
          );
        })}
      </Select>
      {provider && (
        <>
          <Select
            value={benchmarkType}
            name="benchmarkType"
            onChange={(value) => {
              setBenchmarkType(value);
            }}
            placeholder="Select check type"
            label="Select Check Type"
            sizing="xs"
          >
            {getProviderNodeList(provider)?.map((provider) => {
              return (
                <SelectItem value={provider} key={provider}>
                  {provider}
                </SelectItem>
              );
            })}
          </Select>
        </>
      )}
    </div>
  );
};

const CommomForm = () => {
  const [severity, setSeverity] = useState('');
  const [nodeType, setNodeType] = useState('');

  return (
    <>
      <Select
        label="Select Severity"
        value={severity}
        name="provider"
        onChange={(value) => {
          setSeverity(value);
        }}
        placeholder="Select Severity"
        sizing="xs"
      >
        {['Critical', 'High', 'Medium', 'Low'].map((resource) => {
          return (
            <SelectItem value={resource} key={resource}>
              {resource}
            </SelectItem>
          );
        })}
      </Select>
      <Select
        label="Select Node Type"
        value={nodeType}
        name="nodeType"
        onChange={(value) => {
          setNodeType(value);
        }}
        placeholder="Select Node Type"
        sizing="xs"
      >
        {['Host', 'Container', 'Container Image', 'Top'].map((resource) => {
          return (
            <SelectItem value={resource} key={resource}>
              {resource}
            </SelectItem>
          );
        })}
      </Select>
    </>
  );
};

const DownloadForm = () => {
  const [resource, setResource] = useState('');
  const [duration, setDuration] = useState('');
  const [downloadType, setDownloadType] = useState('');
  const [deadNodes, setIncludeDeadNodes] = useState(false);

  return (
    <Form method="post">
      <Card className="w-full relative p-5 flex flex-col pt-8 gap-y-4">
        <Select
          label="Select Resource"
          value={resource}
          name="resource"
          onChange={(value) => {
            setResource(value);
          }}
          placeholder="Select resource"
          sizing="xs"
        >
          {['Vulnerability', 'Secret', 'Malware', 'Compliance'].map((resource) => {
            return (
              <SelectItem value={resource} key={resource}>
                {resource}
              </SelectItem>
            );
          })}
        </Select>

        {resource === 'Compliance' ? <ComplianceForm /> : null}

        {resource !== 'Compliance' ? <CommomForm /> : null}

        <Select
          label="Select Duration"
          value={duration}
          name="duration"
          onChange={(value) => {
            setDuration(value);
          }}
          placeholder="Select Duration"
          sizing="xs"
        >
          {[
            'Last 1 Day',
            'Last 7 Days',
            'Last 30 Days',
            'Last 60 Days',
            'Last 90 Days',
            'Last 180 Days',
            'All Documents',
          ].map((resource) => {
            return (
              <SelectItem value={resource} key={resource}>
                {resource}
              </SelectItem>
            );
          })}
        </Select>

        <TextInput
          className="w-full"
          label={'Schedule Interval In Days'}
          type={'text'}
          sizing="sm"
          name={'interval'}
          placeholder={'Interval'}
        />

        <Switch
          label="Include Dead Nodes"
          size="sm"
          name="selectAll"
          value="all"
          onCheckedChange={setIncludeDeadNodes}
          checked={deadNodes}
        />

        <Select
          label="Select Download Type"
          value={downloadType}
          name="downloadType"
          onChange={(value) => {
            setDownloadType(value);
          }}
          placeholder="Download Type"
          sizing="xs"
        >
          {['XLSX', 'PDF'].map((resource) => {
            return (
              <SelectItem value={resource} key={resource}>
                {resource}
              </SelectItem>
            );
          })}
        </Select>

        <Button size="xs" color="primary" className="mt-2">
          Download
        </Button>
      </Card>
    </Form>
  );
};

const DownloadReport = () => {
  return (
    <>
      <div className="flex p-2  w-full items-center shadow bg-white dark:bg-gray-800">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <DFLink to="/integrations">INTEGRATIONS</DFLink>
          </BreadcrumbLink>

          <BreadcrumbLink>
            <span className="inherit cursor-auto">Report Download</span>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>
      <div className="grid grid-cols-[310px_1fr] p-2 gap-x-2">
        <DownloadForm />
      </div>
    </>
  );
};

export const module = {
  element: <DownloadReport />,
};
