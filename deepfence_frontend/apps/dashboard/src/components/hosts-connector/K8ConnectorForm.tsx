import cx from 'classnames';
import { memo, useEffect, useMemo, useState } from 'react';
import { HiViewGridAdd } from 'react-icons/hi';
import {
  Card,
  Select,
  SelectItem,
  Step,
  Stepper,
  TextInput,
  Typography,
} from 'ui-components';

import { CopyToClipboard } from '@/components/CopyToClipboard';
import { useGetApiToken } from '@/features/common/data-component/getApiTokenApiLoader';
import { containsWhiteSpace } from '@/utils/validator';

const containerRuntimeDropdown = [
  {
    name: 'containerd',
    value: `--set mountContainerRuntimeSocket.containerdSock=true \\ 
--set mountContainerRuntimeSocket.dockerSock=false \\ 
--set mountContainerRuntimeSocket.crioSock=false`,
  },
  {
    name: 'docker',
    value: `--set mountContainerRuntimeSocket.containerdSock=false \\ 
--set mountContainerRuntimeSocket.dockerSock=true \\ 
--set mountContainerRuntimeSocket.crioSock=false`,
  },
  {
    name: 'cri-o',
    value: `--set mountContainerRuntimeSocket.containerdSock=false 
\\ --set mountContainerRuntimeSocket.dockerSock=false 
\\ --set mountContainerRuntimeSocket.crioSock=true`,
  },
];

const socketMap: {
  [k: string]: {
    path: string;
    command: string;
  };
} = {
  containerd: {
    path: '/run/containerd/containerd.sock',
    command: `--set mountContainerRuntimeSocket.containerdSockPath`,
  },
  docker: {
    path: '/var/run/docker.sock',
    command: `--set mountContainerRuntimeSocket.dockerSockPath`,
  },
  'cri-o': {
    path: '/var/run/crio/crio.sock',
    command: `--set mountContainerRuntimeSocket.crioSockPath`,
  },
};

const defaultCluster = 'prod-cluster';
const defaultNamespace = 'deepfence';
const defaultRuntime = containerRuntimeDropdown[0].name;
const defaultSocketPath = socketMap.containerd.path;

const InformationForm = memo(
  ({
    setInstruction,
  }: {
    setInstruction: React.Dispatch<React.SetStateAction<string>>;
  }) => {
    const [clusterName, setClusterName] = useState(defaultCluster);
    const [namespace, setNamespace] = useState(defaultNamespace);
    const [containerRuntime, setContainerRuntime] = useState(defaultRuntime);
    const [socketPath, setSocketPath] = useState(defaultSocketPath);

    const [command, setCommand] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
      if (containsWhiteSpace(clusterName)) {
        setError('Spaces are not allowed in cluster name.');
      } else if (containsWhiteSpace(namespace)) {
        setError('Spaces are not allowed in namespace.');
      } else if (containsWhiteSpace(socketPath)) {
        setError('Spaces are not allowed in socket path.');
      } else {
        setError('');
      }
    }, [clusterName, namespace, socketPath]);

    useEffect(() => {
      setInstruction(command);
    }, [command]);

    const onClusterNameChange = (event: React.FormEvent<HTMLInputElement>) => {
      setClusterName(event.currentTarget.value);
    };

    const onNamespaceChange = (event: React.FormEvent<HTMLInputElement>) => {
      setNamespace(event.currentTarget.value);
    };

    const onSocketPathChange = (event: React.FormEvent<HTMLInputElement>) => {
      setSocketPath(event.currentTarget.value);
    };

    const { status, data } = useGetApiToken();
    const dfApiKey =
      status !== 'idle'
        ? '---DEEPFENCE-API-KEY---'
        : data?.api_token === undefined
        ? '---DEEPFENCE-API-KEY---'
        : data?.api_token;

    useMemo(() => {
      const _clusterName = containsWhiteSpace(clusterName) ? defaultCluster : clusterName;
      const _namespace = containsWhiteSpace(namespace) ? defaultNamespace : namespace;

      const _socketPath = containsWhiteSpace(socketPath)
        ? socketMap[containerRuntime].path
        : socketPath;

      const runtime = containerRuntimeDropdown.find(
        (runtime) => runtime.name === containerRuntime,
      );
      const runtimeCommand = runtime?.value || '';
      const sockCommand = socketMap[containerRuntime].command || '';

      const installCommand = `helm install deepfence-agent deepfence/deepfence-agent \\
--set managementConsoleUrl=${window.location.host ?? '---CONSOLE-IP---'} \\
--set deepfenceKey=${dfApiKey} \\
--set image.tag=${''} \\
--set image.clusterAgentImageTag=${''} \\
--set clusterName=${_clusterName} \\
${runtimeCommand} \\
${sockCommand}="${_socketPath}" \\
--namespace ${_namespace} \\
--create-namespace`;

      setCommand(installCommand);
    }, [clusterName, namespace, socketPath, containerRuntime]);

    return (
      <div className="p-5">
        <div className="grid grid-cols-2 mb-4">
          <div className="max-w-sm">
            <TextInput
              label="Enter Cluster Name"
              type={'text'}
              sizing="sm"
              name="clusterName"
              onChange={onClusterNameChange}
              value={clusterName}
            />
          </div>
          <div className="max-w-sm">
            <TextInput
              label="Enter Namespace"
              type={'text'}
              sizing="sm"
              name="namespace"
              onChange={onNamespaceChange}
              value={namespace}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 mb-4">
          <div className="max-w-sm">
            <Select
              value={containerRuntime}
              name="region"
              onChange={(value) => {
                setContainerRuntime(value);
                setSocketPath(socketMap[value].path || '');
              }}
              label="Select Container Runtime"
              sizing="xs"
            >
              {containerRuntimeDropdown.map((runtime) => (
                <SelectItem value={runtime.name} key={runtime.name} />
              ))}
            </Select>
          </div>
          <div className="max-w-sm">
            <TextInput
              label="Enter Socket Path"
              type={'text'}
              sizing="sm"
              name="socketPath"
              value={socketPath}
              onChange={onSocketPathChange}
            />
          </div>
        </div>
        <div className={`text-red-600 dark:text-red-500 ${Typography.size.sm}`}>
          {error && <span>{error}</span>}
        </div>
      </div>
    );
  },
);

export const K8ConnectorForm = () => {
  const { status, data } = useGetApiToken();
  const dfApiKey =
    status !== 'idle'
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token === undefined
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token;

  const [instruction, setInstruction] =
    useState(`helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
helm repo update

helm install deepfence-agent deepfence/deepfence-agent \\
--set managementConsoleUrl=${window.location.host ?? '---CONSOLE-IP---'} \\
--set deepfenceKey=${dfApiKey} \\
--set image.tag=${''} \\
--set image.clusterAgentImageTag=${''} \\
--set clusterName=${defaultCluster} \\
${containerRuntimeDropdown[0].value} \\
${socketMap.containerd.command}="${defaultSocketPath}" \\
--namespace ${defaultNamespace} \\
--create-namespace`);

  return (
    <div className="w-full">
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Connect Kubernetes Cluster">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Connect via Kubernetes Scanner. Find out more information by{' '}
            <a
              href={`https://docs.deepfence.io/threatstryker/docs/sensors/kubernetes`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-500 mt-2"
            >
              reading our documentation
            </a>
            .
          </div>
        </Step>
        <Step indicator="1" title="Enter Information">
          <div>
            <p className={`mb-2.5 ${Typography.size.sm} dark:text-gray-200`}>
              Enter cluster information:
            </p>
            <Card className="w-full relative ">
              <InformationForm setInstruction={setInstruction} />
            </Card>
          </div>
        </Step>
        <Step indicator="2" title="Copy Code">
          <div className={`${Typography.size.sm} dark:text-gray-400`}>
            <p className="mb-2.5">
              Copy the following commands and paste them into your shell.
            </p>
            <Card className="w-full relative">
              <div className="relative">
                <pre
                  className={cx(
                    'pl-4 pt-4',
                    'h-fit',
                    `${Typography.weight.normal} ${Typography.size.xs} `,
                  )}
                >
                  helm repo add deepfence
                  https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
                </pre>
                <CopyToClipboard
                  data={
                    'helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper'
                  }
                  className="top-4"
                  asIcon
                />
              </div>
              <div className="relative">
                <pre
                  className={cx(
                    'pl-4',
                    'h-fit',
                    `${Typography.weight.normal} ${Typography.size.xs} `,
                  )}
                >
                  helm repo update
                </pre>
                <CopyToClipboard data={'helm repo update'} className="top-0" asIcon />
              </div>
              <div className="relative">
                <pre
                  className={cx(
                    'pl-4',
                    'h-fit',
                    `${Typography.weight.normal} ${Typography.size.xs} `,
                  )}
                >
                  {instruction}
                </pre>
                <CopyToClipboard data={instruction} className="top-0" asIcon />
              </div>
            </Card>
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
