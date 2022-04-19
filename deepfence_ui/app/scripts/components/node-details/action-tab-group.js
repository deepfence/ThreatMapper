import React, { useMemo} from 'react';
import { useSelector } from 'react-redux';
import ActionTab from './action-tab';
import { ScanModal } from './scan-modal';


const ActionTabGroup = (props) => {
  const {
    details,
    topologyId,
    nodeId,
    destinationIp
  } = props;

  const {
    metadata,
    imageId,
  } = useMemo(() => {
    const metadata = new Map();

    details?.metadata?.forEach?.((el) => {
      metadata.set(el.id, el.value);
    });

    let imageId;
    if (
      metadata.size &&
      (details?.type === 'container' || details?.type === 'container_image') &&
      metadata.has('docker_image_name')
    ) {
      imageId = `${metadata.get('docker_image_name')}:${metadata.get('docker_image_tag')}`
    } else if (metadata.size && details?.type === 'host' && metadata.has('host_name')) {
      imageId = metadata.get('host_name')?.trim();
    }
    return {
      metadata,
      imageId,
    }
  }, [details]);

  const { cveStore } = useSelector((state) => {
    const cve = state.get('cve');
    return {
      cveStore: cve ? cve.toJS() : {},
    }
  });

  let cveInfoSummary;
  if (cveStore.status && imageId) {
    const currentImageStatus = cveStore.status[imageId] ? cveStore.status[imageId] : {};
    const data = currentImageStatus.data ? currentImageStatus.data : {};
    cveInfoSummary = data.summary;
  }

  const isUIVM = metadata.get('is_ui_vm') === 'true';
  const isHost = nodeId.indexOf('<host>') !== -1;
  const isContainer = nodeId.indexOf('<container>') !== -1;
  const isContainerImage = nodeId.indexOf('<container_image>') !== -1;
  const showScanButton = (isHost || isContainer || isContainerImage) && !isUIVM;
  const scanModalProps = {
    title: 'Start Scan',
    modalContent: () => <ScanModal details={details} imageId={imageId} />,
    contentStyles: {
      width: '550px',
    },
  };

  return (
    <div className="node-details-actions-tab">
      {
        showScanButton && (
          <ActionTab
            displayName="Scan"
            infoSummary={cveInfoSummary}
            modalType="GENERIC_MODAL"
            modalProps={scanModalProps}
          />)
      }
    </div>
  );

}

export default ActionTabGroup;
