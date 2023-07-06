import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  IconButton,
  Listbox,
  ListboxOption,
  Step,
  Stepper,
  TextInput,
} from 'ui-components';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { InfoIcon } from '@/components/icons/common/Info';
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

const InformationForm = ({
  setInstruction,
  dfApiKey,
}: {
  setInstruction: React.Dispatch<React.SetStateAction<string>>;
  dfApiKey: string;
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
  }, [clusterName, namespace, socketPath, containerRuntime, dfApiKey]);

  return (
    <div className="p-5">
      <div className="grid grid-cols-2 mb-4">
        <div className="max-w-sm">
          <TextInput
            label="Enter Cluster Name"
            type={'text'}
            name="clusterName"
            onChange={onClusterNameChange}
            value={clusterName}
          />
        </div>
        <div className="max-w-sm">
          <TextInput
            label="Enter Namespace"
            type={'text'}
            name="namespace"
            onChange={onNamespaceChange}
            value={namespace}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 mb-4">
        <div className="max-w-sm">
          <Listbox
            value={containerRuntime}
            name="runtime"
            onChange={(value) => {
              setContainerRuntime(value);
              setSocketPath(socketMap[value].path || '');
            }}
            label="Select Container Runtime"
            getDisplayValue={() => {
              return containerRuntime;
            }}
          >
            {containerRuntimeDropdown.map((runtime) => (
              <ListboxOption value={runtime.name} key={runtime.name}>
                {runtime.name}
              </ListboxOption>
            ))}
          </Listbox>
        </div>
        <div className="max-w-sm">
          <TextInput
            label="Enter Socket Path"
            type={'text'}
            name="socketPath"
            value={socketPath}
            onChange={onSocketPathChange}
          />
        </div>
      </div>
      <div className="text-red-600 dark:text-status-error text-p7">
        {error && <span>{error}</span>}
      </div>
    </div>
  );
};

const FirstCommand = () => {
  const { copy, isCopied } = useCopyToClipboardState();
  return (
    <div className="relative flex items-center">
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">
        helm repo add deepfence
        https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
      </pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy(
              'helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper',
            );
          }}
        />
      </div>
    </div>
  );
};
const SecondCommand = () => {
  const { copy, isCopied } = useCopyToClipboardState();
  return (
    <div className="relative flex items-center">
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">helm repo update</pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy('helm repo update');
          }}
        />
      </div>
    </div>
  );
};

const ThirdCommand = ({ command }: { command: string }) => {
  const { copy, isCopied } = useCopyToClipboardState();
  return (
    <div className="relative flex items-center">
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">{command}</pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy(command);
          }}
        />
      </div>
    </div>
  );
};
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
        <Step
          indicator={
            <span className="w-4 h-4">
              <InfoIcon />
            </span>
          }
          title="Connect Kubernetes Cluster"
        >
          <div className="text-p7 dark:text-text-text-and-icon">
            Connect via Kubernetes Scanner. Find out more information by{' '}
            <DFLink
              href={`https://docs.deepfence.io/threatstryker/docs/sensors/kubernetes`}
              target="_blank"
              rel="noreferrer"
              className="mt-2"
            >
              reading our documentation
            </DFLink>
            .
          </div>
        </Step>
        <Step indicator="1" title="Enter Information">
          <div>
            <p className="mb-2.5 text-p7 dark:text-text-text-and-icon">
              Fill the following details:
            </p>
            <Card className="w-full relative">
              <InformationForm setInstruction={setInstruction} dfApiKey={dfApiKey} />
            </Card>
          </div>
        </Step>
        <Step indicator="2" title="Copy Code">
          <div className="text-p7 dark:text-text-text-and-icon">
            <p className="mb-2.5">
              Copy the following commands and paste them into your shell.
            </p>
            <Card className="w-full relative p-4">
              <FirstCommand />
              <SecondCommand />
              <ThirdCommand command={instruction} />
            </Card>
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
