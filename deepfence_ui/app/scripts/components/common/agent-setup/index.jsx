
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import useCopyToClipboard from 'react-use/lib/useCopyToClipboard';
import { toaster } from '../../../actions';
import styles from './agent-setup.module.scss';


const getDockerInstructions = () => {
  return `docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host \\
  --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \\
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \\
  -e USER_DEFINED_TAGS="" -e MGMT_CONSOLE_URL="${window.location.host ?? '---CONSOLE-IP---'}" -e MGMT_CONSOLE_PORT="443" \\
  -e DEEPFENCE_KEY="${localStorage.getItem('dfApiKey') ?? '---DEEPFENCE-API-KEY---'}" \\
  deepfenceio/deepfence_agent_ce:${process.env.__PRODUCTVERSION__}
`;
}

const getK8sInstructions = () => {
  return `helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
helm repo update

helm install deepfence-agent deepfence/deepfence-agent \\
  --set managementConsoleUrl=${window.location.host ?? '---CONSOLE-IP---'} \\
  --set deepfenceKey=${localStorage.getItem('dfApiKey') ?? '---DEEPFENCE-API-KEY---'} \\
  --set image.tag=${process.env.__PRODUCTVERSION__} \\
  --set image.clusterAgentImageTag=${process.env.__PRODUCTVERSION__} \\
  --set clusterName=prod-cluster-1 \\
  --namespace deepfence \\
  --create-namespace`;
};

export const AgentSetup = () => {

  const dispatch = useDispatch();

  const [state, copyToClipboard] = useCopyToClipboard();

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

  return (
    <div className={styles.wrapper}>
      <p>Please follow the instructions below to set-up deepfence agent.</p>
      <div className={styles.setupHeader}>
        Docker:
      </div>
      <div className={styles.codeBlock}>
        {
          getDockerInstructions()
        }
        <i className={`fa fa-copy ${styles.copyButton}`} onClick={onDockerCopyClick} />
      </div>
      <p>For more details reference our <a href="https://community.deepfence.io/docs/threatmapper/sensors/docker" target="_blank" rel="noreferrer">agent installation documentation.</a></p>
      <div className={styles.setupHeader}>
        K8s:
      </div>
      <div className={styles.codeBlock}>
        {
          getK8sInstructions()
        }
        <i className={`fa fa-copy ${styles.copyButton}`} onClick={onK8sCopyClick} />
      </div>
      <p>For more details reference our <a href="https://community.deepfence.io/docs/threatmapper/sensors/kubernetes" target="_blank" rel="noreferrer">agent installation documentation.</a></p>
    </div>
  )
}
