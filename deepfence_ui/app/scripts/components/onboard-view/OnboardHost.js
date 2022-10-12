import React from 'react';
import useCopyToClipboard from 'react-use/lib/useCopyToClipboard';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import cx from 'classnames';
import { OnboardModal } from './OnboardModal';

const getDockerInstructions = licenseResponse => {
  return `docker login --username ${
    licenseResponse?.registry_credentials?.username ?? '########'
  } quay.io
# (Enter password: ${
    licenseResponse?.registry_credentials?.password ?? '######'
  })

docker run -dit --cpus=".5" --ulimit core=0 --name=deepfence-agent --restart on-failure --pid=host --net=host \\
  --uts=host --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced -v /var/run/docker.sock:/var/run/docker.sock \\
  -v /var/lib/docker/:/fenced/mnt/host/var/lib/docker/:rw -v /:/fenced/mnt/host/:ro -e DF_FIM_ON="Y" -e DF_TRAFFIC_ANALYSIS_ON="" \\
  -e DF_ENABLE_PROCESS_REPORT="true" -e DF_ENABLE_CONNECTIONS_REPORT="true" -e INSTANCE_ID_SUFFIX="N" -e DF_PKT_CAPTURE_PERCENTAGE="100"\\
  -e USER_DEFINED_TAGS= -e DF_PKT_CAPTURE_SNAP_LENGTH="65535" -e DF_CAPTURE_INTF="any" \\
  -e MGMT_CONSOLE_URL="${
    window.location.host ?? '---CONSOLE-IP---'
  }" -e MGMT_CONSOLE_PORT="443" -e SCOPE_HOSTNAME="$(hostname)" \\
  -e DEEPFENCE_KEY="${localStorage.getItem(
    'dfApiKey'
  )}" -e DF_TRAFFIC_ANALYSIS_PROCESSES="" -e DF_TRAFFIC_ANALYSIS_MODE="all" \\
  quay.io/deepfenceio/deepfence_agent:${process.env.__PRODUCTVERSION__}
`;
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
  font-size: 14px;
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
  &:focus {
    outline: none;
  }
`;

const More = styled.p`
  margin-top: 18px;
  font-size: 14px;
`;

const Body = styled.div`
  color: #c0c0c0;
  margin-top: 1em;
`;
const BackButton = styled.button`
  all: unset;
  color: #c0c0c0;
  cursor: pointer;
  &:focus {
    outline: none;
  }
  &:hover {
    color: #ffffff;
  }
  padding: 6px 8px;
`;

export const HostSetup = props => {
  const [copy, copyToClipboard] = useCopyToClipboard();

  const licenseResponse = useSelector(state => state.get('licenseResponse'));

  const onDockerCopyClick = () => {
    copyToClipboard(getDockerInstructions(licenseResponse));
  };
  return (
    <>
      {props.history && (
        <BackButton onClick={props.history.goBack}>
          <i className="fa fa-long-arrow-left" aria-hidden="true" />
          &nbsp;Back
        </BackButton>
      )}
      <Body>
        <p>
          Please install the deepfence sensors to your Linux VMs to check for
          compliance misconfigurations.
        </p>
        <Title>Docker:</Title>
        <Code>
          <CodeText>{getDockerInstructions(licenseResponse)}</CodeText>
          <CopyButton
            className={cx({
              'fa fa-check': copy.value,
              'fa fa-copy': !copy.value,
            })}
            onClick={onDockerCopyClick}
            aria-hidden="true"
          />
        </Code>
        <More>
          For more details reference our{' '}
          <a
            href="https://docs.deepfence.io/threatstryker/docs/sensors/docker"
            target="_blank"
            rel="noreferrer"
          >
            agent installation documentation.
          </a>
        </More>
      </Body>
    </>
  );
};

export const HostModal = props => {
  const { open, setModal } = props;

  if (!open) {
    return null;
  }

  return (
    <OnboardModal isOpen={open} setModal={setModal}>
      <HostSetup />
    </OnboardModal>
  );
};
