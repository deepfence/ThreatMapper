import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import useCopyToClipboard from 'react-use/lib/useCopyToClipboard';
import { toaster } from '../../../actions';
import styles from './agent-setup.module.scss';

const containerRuntimeDropdown = [
  {
    name: 'containerd',
    value:
      '--set mountContainerRuntimeSocket.containerdSock=true --set mountContainerRuntimeSocket.dockerSock=false --set mountContainerRuntimeSocket.crioSock=false',
  },
  {
    name: 'docker',
    value:
      '--set mountContainerRuntimeSocket.containerdSock=false --set mountContainerRuntimeSocket.dockerSock=true --set mountContainerRuntimeSocket.crioSock=false',
  },
  {
    name: 'cri-o',
    value:
      '--set mountContainerRuntimeSocket.containerdSock=false --set mountContainerRuntimeSocket.dockerSock=false --set mountContainerRuntimeSocket.crioSock=true',
  },
];

export const AgentSetup = () => {
  const dispatch = useDispatch();

  const [state, copyToClipboard] = useCopyToClipboard();

  const [clusterName, setClusterName] = useState('prod-cluster');
  const [namespace, setNamespace] = useState('deepfence');
  const [containerRuntime, setContainerRuntime] = useState(containerRuntimeDropdown[0].value);
  const [socketPath, setSocketPath] = useState();

  function onDockerCopyClick() {
    copyToClipboard(getDockerInstructions());
  }

  function onK8sCopyClick() {
    copyToClipboard(getK8sInstructions());
  }

  useEffect(() => {
    if (state.value) {
      dispatch(toaster('Copied successfully.'));
    } else if (state.error) {
      dispatch(toaster('Failed to copy.'));
    }
  }, [state]);

  useEffect(() => {
    if(containerRuntime === '--set mountContainerRuntimeSocket.containerdSock=false --set mountContainerRuntimeSocket.dockerSock=true --set mountContainerRuntimeSocket.crioSock=false'){
      setSocketPath('/var/run/docker.sock')
    }
    else if(containerRuntime === '--set mountContainerRuntimeSocket.containerdSock=false --set mountContainerRuntimeSocket.dockerSock=false --set mountContainerRuntimeSocket.crioSock=true'){
      setSocketPath('/var/run/crio/crio.sock')
    }
    else{
      setSocketPath('/run/containerd/containerd.sock')
    }
  }, [containerRuntime])




  const getK8sInstructions = () => {
    let socketPathValue;
    if(containerRuntime === '--set mountContainerRuntimeSocket.containerdSock=true --set mountContainerRuntimeSocket.dockerSock=false --set mountContainerRuntimeSocket.crioSock=false'){
      socketPathValue = `containerdSockPath="${socketPath}"`
    }
    if(containerRuntime === '--set mountContainerRuntimeSocket.containerdSock=false --set mountContainerRuntimeSocket.dockerSock=true --set mountContainerRuntimeSocket.crioSock=false'){
      socketPathValue = `dockerSockPath="${socketPath}"`
    }
    if(containerRuntime === '--set mountContainerRuntimeSocket.containerdSock=false --set mountContainerRuntimeSocket.dockerSock=false --set mountContainerRuntimeSocket.crioSock=true'){
      socketPathValue = `crioSockPath="${socketPath}"`
    }

    return `helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
helm repo update

helm install deepfence-agent deepfence/deepfence-agent \\
  --set managementConsoleUrl=${window.location.host ?? '---CONSOLE-IP---'} \\
  --set deepfenceKey=${
    localStorage.getItem('dfApiKey') ?? '---DEEPFENCE-API-KEY---'
  } \\
  --set image.tag=${process.env.__PRODUCTVERSION__} \\
  --set image.clusterAgentImageTag=${process.env.__PRODUCTVERSION__} \\
  --set clusterName=${clusterName} \\
  ${containerRuntime} \\
  --set mountContainerRuntimeSocket.${socketPathValue} \\
  --namespace ${namespace || 'deepfence'} \\
  --create-namespace \\
  --version 1.5.0`;
  };

  const getDockerInstructions = () => {
    return `docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host \\
  --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \\
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \\
  -e USER_DEFINED_TAGS="" -e MGMT_CONSOLE_URL="${
    window.location.host ?? '---CONSOLE-IP---'
  }" -e MGMT_CONSOLE_PORT="443" \\
  -e DEEPFENCE_KEY="${
    localStorage.getItem('dfApiKey') ?? '---DEEPFENCE-API-KEY---'
  }" \\
  deepfenceio/deepfence_agent_ce:${process.env.__PRODUCTVERSION__}
`;
  };

  return (
    <div className={styles.wrapper}>
      <p>Please follow the instructions below to set-up deepfence agent.</p>
      <div className={styles.setupHeader}>Docker:</div>
      <div className={styles.codeBlock}>
        {getDockerInstructions()}
        <i
          className={`fa fa-copy ${styles.copyButton}`}
          onClick={onDockerCopyClick}
        />
      </div>
      <p>
        For more details reference our{' '}
        <a
          href="https://community.deepfence.io/threatmapper/docs/v1.5/sensors/docker"
          target="_blank"
          rel="noreferrer"
        >
          agent installation documentation.
        </a>
      </p>
      <div className={styles.setupHeader}>K8s:</div>
      <div className="form-wrapper" style={{ width: 'max-content' }}>
        <form name="form">
          <div className="row" style={{ width: 'fit-content' }}>
            <div className="col-12">
              <div className="row" style={{ width: 'max-content' }}>
                <div className="col">
                  <div className="form-group">
                    <div className="label">
                      Enter Cluster Name
                    </div>
                    <label htmlFor="cluster-name">
                      <input
                        style={{
                          width: '230px',
                          height: '40px',
                          paddingLeft: '18px'
                        }}
                        type="text"
                        className="form-control"
                        name="cluster-name"
                        placeholder="Cluster Name"
                        value={clusterName}
                        onChange={e => setClusterName(e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                <div className="col">
                  <div className="form-group">
                    <div className="label">
                      Enter Namespace
                    </div>
                    <label htmlFor="namespace">
                      <input
                        style={{
                          width: '230px',
                          height: '40px',
                          paddingLeft: '18px'
                        }}
                        type="text"
                        className="form-control"
                        name="namespace"
                        placeholder="Namespace"
                        value={namespace}
                        onChange={e => setNamespace(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col">
                  <div className="form-field">
                    <div className="label" htmlFor="dir-sev">
                      Select Container Runtime
                    </div>
                    <div>
                      <div>
                        <select
                          className="form-select"
                          style={{
                            width: '230px',
                            height: '40px',
                            background: '#303030',
                            color: '#999999',
                          }}
                          defaultValue={containerRuntimeDropdown[0].value}
                          onChange={e => setContainerRuntime(e.target.value)}
                        >
                          {containerRuntimeDropdown.map(s => (
                            <option value={s.value} key={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {containerRuntime && (
                  <div className="col">
                    <div className="form-group">
                      <div className="label" htmlFor="dir-sev">
                        Enter Socket Path
                      </div>
                      <label htmlFor="socketPath">
                      <input
                        style={{
                          width: '230px',
                          height: '40px',
                          paddingLeft: '18px'
                        }}
                        type="text"
                        className="form-control"
                        name="socketPath"
                        value={socketPath}
                        onChange={e => setSocketPath(e.target.value)}
                      />
                    </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
      <div className={styles.codeBlock}>
        {getK8sInstructions()}
        <i
          className={`fa fa-copy ${styles.copyButton}`}
          onClick={onK8sCopyClick}
        />
      </div>
      <p>
        For more details reference our{' '}
        <a
          href="https://community.deepfence.io/threatmapper/docs/v1.5/sensors/kubernetes"
          target="_blank"
          rel="noreferrer"
        >
          agent installation documentation.
        </a>
      </p>
    </div>
  );
};
