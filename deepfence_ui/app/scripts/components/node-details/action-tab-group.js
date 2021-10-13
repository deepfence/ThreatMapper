/* eslint-disable prefer-destructuring */
/* eslint-disable react/destructuring-assignment */
/*eslint-disable*/
import React from 'react';
import {connect} from 'react-redux';
import CVE from './cve-modal';
import {getHostNameWithoutSemicolon} from '../../utils/string-utils';
import ActionTab from './action-tab';
import {
  getCVEScanStatusAction,
  toaster,
} from '../../actions/app-actions';


class ActionTabGroup extends React.PureComponent {
  constructor(props) {
    super(props);
    this.renderCVE = this.renderCVE.bind(this);
    this.pollCVEStatus = this.pollCVEStatus.bind(this);
    this.determineNodeBasicInfo();
    this.upgradeAgent = this.upgradeAgent.bind(this);
    this.deregisterAgent = this.deregisterAgent.bind(this);
  }


  componentDidMount() { 
    this.determineNodeBasicInfo();
  }

  componentDidUpdate(prevProps) {
    this.determineNodeBasicInfo();
  }

  pollCVEStatus() {
    const { dispatch } = this.props;
    return dispatch(getCVEScanStatusAction(this.imageId));
  }

  determineNodeBasicInfo() {
    const { details } = this.props;
    let imageId;
    let hostName;
    let containerName;
    let podName;
    if (
      details &&
      details.metadata &&
      (details.type === 'container' || details.type === 'container_image')
    ) {
      hostName = details.labelMinor;
      containerName = details.label;
      for (let i = 0; i < details.metadata.length; i += 1) {
        if (details.metadata[i].id === 'docker_image_name') {
          const imageMetaList = details.metadata.filter(
            el => el.id === 'docker_image_name' || el.id === 'docker_image_tag'
          );
          const imageName =
            imageMetaList.filter(el => el.id === 'docker_image_name').pop() ||
            {};
          const imageTag =
            imageMetaList.filter(el => el.id === 'docker_image_tag').pop() ||
            {};
          imageId = `${imageName.value}:${imageTag.value}`;
          break;
        }
      }
    } else if (details && details.metadata && details.type === 'host') {
      hostName = getHostNameWithoutSemicolon(details.id);
      for (let i = 0; i < details.metadata.length; i += 1) {
        if (details.metadata[i].id === 'host_name') {
          imageId = details.metadata[i].value.trim();
          break;
        }
      }
    } else if (details && details.parents && details.type === 'pod') {
      podName = details.label; // assuming pod names are correct
      // labelMinor field for pods do not contain the actual hostname
      for (let i = 0; i < details.parents.length; i += 1) {
        if (details.parents[i].id.indexOf('<host>') !== -1) {
          hostName = details.parents[i].label.trim();
        }
      }
    }
    this.imageId = imageId;
    this.hostName = hostName;
    this.podName = podName;
    this.containerName = containerName;
  }

  upgradeAgent(paramsIm) {
    const params = paramsIm.toJS();
    const { dispatch, details } = this.props;
    params.nodeId = details.id;
    return dispatch(agentUpgradeAction(params)).then(response => {
      const { success, error: apiError } = response;
      if (success) {
        dispatch(toaster('Request to upgrade agent is successfully queued'));
      } else {
        dispatch(toaster(`${apiError.message}`));
      }
    });
  }

  deregisterAgent(paramsIm) {
    const params = paramsIm.toJS();
    const { dispatch, details } = this.props;
    params.nodeId = details.id;
    return dispatch(agentDeregisterAction(params)).then(response => {
      const { success, error: apiError } = response;
      if (success) {
        dispatch(toaster('Request to deregister agent is successfully queued'));
      } else {
        dispatch(toaster(`${apiError.message}`));
      }
    });
  }

  renderCVE() {
    const { details } = this.props;
    return <CVE details={details} />;
  }

  render() {
    const {
      details,
      cveStore,
    } = this.props;
    let metaIndex = {};
    if (details.metadata) {
      metaIndex = details.metadata.reduce((acc, el) => {
        acc[el.id] = el.value;
        return acc;
      }, {});
    }

    let isDeepfenceContainer = false;
    if (details.tables !== undefined) {
      const { tables } = details;
      for (let i = 0; i < tables.length; i += 1) {
        if (tables[i].id === 'docker_label_') {
          const labels = tables[i].rows;
          for (let y = 0; y < labels.length; y += 1) {
            const labelEntries = labels[y].entries;
            if (
              labelEntries.label === 'deepfence.role' &&
              labelEntries.value === 'system'
            ) {
              isDeepfenceContainer = true;
            }
          }
        }
      }
    }

    let isDeepfenceAgentPod = false;
    if (details.tables !== undefined) {
      const { tables } = details;
      for (let i = 0; i < tables.length; i += 1) {
        if (tables[i].id === 'kubernetes_labels_') {
          const labels = tables[i].rows;
          for (let y = 0; y < labels.length; y += 1) {
            const labelEntries = labels[y].entries;
            if (
              labelEntries.label === 'app.kubernetes.io/name' &&
              labelEntries.value === 'deepfence-agent'
            ) {
              isDeepfenceAgentPod = true;
            }
          }
        }
      }
    }

    const isUIVM = metaIndex.is_ui_vm === 'true';

    const {
      os: operatingSystem = '',
      cloud_provider: cloudProvider = ''
    } = metaIndex;

    const isServerless = cloudProvider.toLowerCase() === 'serverless' || cloudProvider.toLowerCase() === 'aws_fargate';

    // extract image id
    const { imageId } = this;
    let cveInfoSummary;
    if (cveStore.status && imageId) {
      const currentImageStatus = cveStore.status[imageId]
        ? cveStore.status[imageId]
        : {};
      const data = currentImageStatus.data ? currentImageStatus.data : {};
      cveInfoSummary = data.summary;
    }

    const isHost = this.props.nodeId.indexOf('<host>') !== -1;
    const isContainer = this.props.nodeId.indexOf('<container>') !== -1;
    const isContainerImage =
      this.props.nodeId.indexOf('<container_image>') !== -1;
    const isPod = this.props.nodeId.indexOf('<pod>') !== -1;
    const isPodService = this.props.nodeId.indexOf('<service>') !== -1;
    const isPodServiceTypeNodePortOrLB = isPodService
      && metaIndex.kubernetes_type !== ''
      && metaIndex.kubernetes_type !== 'ClusterIP';
    const showCVEButton = (isHost || isContainer || isContainerImage) && !isUIVM; 
    
    const cveModalProps = {
      title: 'Vulnerability Scan',
      modalContent: this.renderCVE,
      contentStyles: {
        width: '400px',
      },
    };
    
    return (
      <div className="node-details-actions-tab">
        { showCVEButton && (
        <ActionTab
          displayName="Vulnerability Scan"
          infoSummary={cveInfoSummary}
          modalType="GENERIC_MODAL"
          modalProps={cveModalProps}
          pollingFunction={this.pollCVEStatus}
        />
        )
        }
      </div>
    );
  }
}

function mapStateToProps(state) {
  const cve = state.get('cve');
  return {
    cveStore: cve ? cve.toJS() : {},
    isToasterVisible: state.get('isToasterVisible'),
    file_list: state.get("file_list"),
  };
}

export default connect(mapStateToProps)(ActionTabGroup);
