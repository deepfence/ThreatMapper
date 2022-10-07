import React from 'react';
import useCopyToClipboard from 'react-use/lib/useCopyToClipboard';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import cx from 'classnames';
import { OnboardModal } from './OnboardModal';

const getK8sInstructions = licenseResponse => {
  return `helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/enterprise
helm repo update

helm install deepfence-agent deepfence/deepfence-agent \\
  --set registry.username=${
    licenseResponse?.registry_credentials?.username ?? '########'
  } \\
  --set registry.password=${
    licenseResponse?.registry_credentials?.password ?? '######'
  } \\
  --set managementConsoleUrl=${window.location.host ?? '---CONSOLE-IP---'} \\
  --set deepfenceKey=${
    localStorage.getItem('dfApiKey') ?? '---DEEPFENCE-API-KEY---'
  } \\
  --set image.tag=${process.env.__PRODUCTVERSION__} \\
  --set image.clusterAgentImageTag=${process.env.__PRODUCTVERSION__} \\
  --set clusterName=prod-cluster-1 \\
  --namespace deepfence \\
  --create-namespace`;
};

const Title = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 16px;
`;

const Code = styled.div`
  margin-top: 8px;
  white-space: pre-wrap;
  font-family: monospace;
  border-radius: 8px;
  padding: 8px;
  position: relative;
  font-size: 1rem;
  line-height: 24px;
`;

const CodeText = styled.code`
  color: #cccccc;
  background: #000;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 8px;
  border-radius: 2px;
  cursor: pointer;
  background: transparent;
  outline: none;
  border: none;
  color: #fff;
`;

const More = styled.p`
  margin-top: 18px;
`;

export const KubernetesSetup = () => {
  const [copy, copyToClipboard] = useCopyToClipboard();
  const licenseResponse = useSelector(state => state.get('licenseResponse'));

  const onK8sCopyClick = () => {
    copyToClipboard(getK8sInstructions(licenseResponse));
  };
  return (
    <>
      <p>Please follow the instructions below to set-up deepfence agent.</p>
      <Title>K8s:</Title>
      <Code>
        <CodeText>{getK8sInstructions(licenseResponse)}</CodeText>
        <CopyButton
          className={cx({
            'fa fa-check': copy.value,
            'fa fa-copy': !copy.value,
          })}
          onClick={onK8sCopyClick}
          aria-hidden="true"
        />
      </Code>
      <More>
        For more details reference our{' '}
        <a
          href="https://docs.deepfence.io/threatstryker/docs/sensors/kubernetes"
          target="_blank"
          rel="noreferrer"
        >
          agent installation documentation.
        </a>
      </More>
    </>
  );
};
export const KubernetesModal = props => {
  const { open, setModal } = props;

  if (!open) {
    return null;
  }

  return (
    <OnboardModal isOpen={open} setModal={setModal}>
      <KubernetesSetup />
    </OnboardModal>
  );
};
