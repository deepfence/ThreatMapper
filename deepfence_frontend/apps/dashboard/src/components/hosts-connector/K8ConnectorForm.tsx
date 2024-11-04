import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Card,
  IconButton,
  ListboxOptionV2,
  ListboxV2,
  Step,
  StepIndicator,
  StepLine,
  Stepper,
  TextInput,
} from 'ui-components';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { InfoIcon } from '@/components/icons/common/Info';
import { queries } from '@/queries';
import { containsWhiteSpace } from '@/utils/validator';

const useGetApiToken = () => {
  return useSuspenseQuery({
    ...queries.auth.apiToken(),
  });
};

const useGetVersion = () => {
  return useSuspenseQuery({
    ...queries.setting.productVersion(),
  });
};

const PLACEHOLDER_API_KEY = '---DEEPFENCE-API-KEY--';
const PLACEHOLDER_VERSION = '---PRODUCT_TAG_VERSION--';

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
    value: `--set mountContainerRuntimeSocket.containerdSock=false \\
  --set mountContainerRuntimeSocket.dockerSock=false \\
  --set mountContainerRuntimeSocket.crioSock=true`,
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
  --set global.imageTag=${PLACEHOLDER_VERSION} \\
  --set clusterName=${_clusterName} \\
  ${runtimeCommand} \\
  ${sockCommand}="${_socketPath}" \\
  --set logLevel="info" \\
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
          <ListboxV2
            value={containerRuntime}
            name="runtime"
            variant="underline"
            setValue={(value) => {
              setContainerRuntime(value);
              setSocketPath(socketMap[value].path || '');
            }}
            label="Select Container Runtime"
            getDisplayValue={() => {
              return containerRuntime;
            }}
          >
            {containerRuntimeDropdown.map((runtime) => (
              <ListboxOptionV2 value={runtime.name} key={runtime.name}>
                {runtime.name}
              </ListboxOptionV2>
            ))}
          </ListboxV2>
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
      <div className="text-status-error text-p7">{error && <span>{error}</span>}</div>
    </div>
  );
};

const FirstCommand = () => {
  const { copy, isCopied } = useCopyToClipboardState();
  return (
    <div className="relative flex items-center">
      <pre className="h-fit text-p7a text-text-text-and-icon">
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
      <pre className="h-fit text-p7a text-text-text-and-icon">helm repo update</pre>
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
  const { status, data } = useGetApiToken();
  const { data: dataVersion } = useGetVersion();
  const version = dataVersion.version || PLACEHOLDER_VERSION;
  const apiToken = data?.apiToken?.api_token;
  const dfApiKey =
    status !== 'success'
      ? PLACEHOLDER_API_KEY
      : apiToken === undefined
        ? PLACEHOLDER_API_KEY
        : apiToken;

  const { copy, isCopied } = useCopyToClipboardState();
  return (
    <div className="relative flex items-center">
      <pre className="h-fit text-p7a text-text-text-and-icon">
        {command
          .replace(PLACEHOLDER_API_KEY, dfApiKey)
          .replaceAll(PLACEHOLDER_VERSION, version.trim())}
      </pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy(
              command
                .replace(PLACEHOLDER_API_KEY, dfApiKey)
                .replaceAll(PLACEHOLDER_VERSION, version.trim()),
            );
          }}
        />
      </div>
    </div>
  );
};
const Skeleton = () => {
  return (
    <>
      <div className="animate-pulse flex flex-col gap-y-2">
        <div className="h-2 w-[384px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[350px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[420px] bg-gray-200 dark:bg-gray-700 rounded"></div>

        <div className="h-2 w-[200px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[300px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[280px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[380px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[370px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[360px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[480px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[200px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[180px] bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </>
  );
};
export const K8ConnectorForm = () => {
  const [instruction, setInstruction] =
    useState(`helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
helm repo update

helm install deepfence-agent deepfence/deepfence-agent \\
  --set managementConsoleUrl=${window.location.host ?? '---CONSOLE-IP---'} \\
  --set deepfenceKey=${PLACEHOLDER_API_KEY} \\
  --set global.imageTag=${''} \\
  --set clusterName=${defaultCluster} \\
  ${containerRuntimeDropdown[0].value} \\
  ${socketMap.containerd.command}="${defaultSocketPath}" \\
  --set logLevel="info" \\
  --namespace ${defaultNamespace} \\
  --create-namespace`);

  return (
    <div className="w-full mt-4">
      <Stepper>
        <Step
          indicator={
            <StepIndicator className="rounded-full">
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="w-4 h-4">
                  <InfoIcon />
                </span>
              </div>
              <StepLine />
            </StepIndicator>
          }
          title="Connect Kubernetes Cluster"
        >
          <div className="text-p7a text-text-text-and-icon">
            Deploy Deepfence agent Kubernetes Scanner. Find out more information by{' '}
            <DFLink
              href={`https://community.deepfence.io/threatmapper/docs/v2.5/sensors/kubernetes`}
              target="_blank"
              rel="noreferrer"
              className="mt-2"
            >
              reading our documentation
            </DFLink>
            .
          </div>
        </Step>
        <Step
          indicator={
            <StepIndicator className="rounded-full">
              <span className="w-6 h-6 flex items-center justify-center">1</span>
              <StepLine />
            </StepIndicator>
          }
          title="Enter Information"
        >
          <div>
            <p className="mb-2.5 text-p7a text-text-text-and-icon">
              Fill the following details:
            </p>
            <Card className="w-full relative">
              <InformationForm
                setInstruction={setInstruction}
                dfApiKey={PLACEHOLDER_API_KEY}
              />
            </Card>
          </div>
        </Step>
        <Step
          indicator={
            <StepIndicator className="rounded-full">
              <span className="w-6 h-6 flex items-center justify-center">2</span>
            </StepIndicator>
          }
          title="Copy Code"
        >
          <div className="text-p7a text-text-text-and-icon">
            <p className="mb-2.5">
              Copy the following commands and paste them into your shell.
            </p>
            <Card className="w-full relative p-4">
              <FirstCommand />
              <SecondCommand />
              <Suspense fallback={<Skeleton />}>
                <ThirdCommand command={instruction} />
              </Suspense>
            </Card>
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
