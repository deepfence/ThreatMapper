import React from 'react';
import {connect} from 'react-redux';
import {fromJS} from 'immutable';
import DownloadForm from './download-form';
import {
  xlsxReportDownloadAction,
  xlsxScheduleEmailAction,
} from '../../../actions/app-actions';
import {objectValueExtractor} from '../../../utils/array-utils';

class ReportDownload extends React.Component {
  constructor(props) {
    super(props);
    this.downloadContent = this.downloadContent.bind(this);
  }

  downloadContent(valuesParamsIm) {
    const {
      xlsxReportDownloadAction: actionDownload,
      xlsxScheduleEmailAction: actionScheduleEmail,
    } = this.props;
    const values = valuesParamsIm.toJS();
    const simpleValues = Object.keys(values).reduce((acc, key) => {
      const value = values[key];
      if (Array.isArray(value)) {
        acc[key] = value.map(objectValueExtractor());
      } else if (typeof value === 'string') {
        acc[key] = value;
      } else {
        acc[key] = value.value || value;
      }
      return acc;
    }, {});
    let valuesIm = fromJS(simpleValues);
    valuesIm = valuesIm.set('resources', valuesParamsIm.get('resources'));
    const nodeType = valuesIm.get('node_type', '');
    const durationStr = valuesIm.get('duration', '');
    const duration = JSON.parse(durationStr);
    const resourceValues = valuesParamsIm.get('resources', []);
    let globalFilter;
    if (nodeType === 'host') {
      const hostName = valuesIm.get('host_name', []);
      const os = valuesIm.get('os', []);
      const k8sClusterName = valuesIm.get('kubernetes_cluster_name', []);
      globalFilter = {
        type: [nodeType],
        host_name: hostName,
        os,
        kubernetes_cluster_name: k8sClusterName,
      };
    } else if (nodeType === 'container') {
      const hostName = valuesIm.get('host_name', []);
      const containerName = valuesIm.get('container_name', []);
      const imageName = valuesIm.get('image_name_with_tag', []);
      const k8sClusterName = valuesIm.get('kubernetes_cluster_name', []);
      globalFilter = {
        type: [nodeType],
        host_name: hostName,
        container_name: containerName,
        image_name_with_tag: imageName,
        kubernetes_cluster_name: k8sClusterName,
      };
    } else if (nodeType === 'container_image') {
      const imageName = valuesIm.get('image_name_with_tag', []);
      globalFilter = {
        type: [nodeType],
        image_name_with_tag: imageName,
      };
    } else if (nodeType === 'pod') {
      const k8sClusterName = valuesIm.get('kubernetes_cluster_name', []);
      const k8sNamespace = valuesIm.get('kubernetes_namespace', []);
      globalFilter = {
        type: [nodeType],
        kubernetes_cluster_name: k8sClusterName,
        kubernetes_namespace: k8sNamespace,
      };
    } else {
      globalFilter = {};
    }
    const resources = resourceValues.map((el) => {
      const {
        label,
        value,
        ...rest
      } = el;
      const payload = {
        type: value,
        filter: {
          ...rest
        },
      };
      return payload;
    });
    const scheduleInterval = valuesIm.get('schedule_interval', '');
    /* eslint-disable */
    let deadNodes;
    if (nodeType === 'host' || nodeType === 'container'){
      let lenHostName = 0;
      globalFilter.host_name.map(x => lenHostName=lenHostName+1)
      deadNodes = valuesIm.get('toggle', '') ? true : false;
      if (lenHostName != 0) {
        deadNodes = false;
      }
    }
    let params = {};
    if (scheduleInterval) {
      const emailAddress = valuesIm.get('email_address', '');
      params = {
        action: 'schedule_send_report',
        node_type: nodeType,
        include_dead_nodes: deadNodes,
        action_args: {
          cron: `0 4 */${scheduleInterval} * *`,
          report_email: emailAddress,
          node_type: nodeType,
          resources,
          filters: globalFilter,
          duration,
        }
      };
      return actionScheduleEmail(params);
    }
    params = {
      action: 'download_report',
      node_type: nodeType,
      include_dead_nodes: deadNodes,
      action_args: {
        resources,
        filters: globalFilter,
        duration,
      }
    };
    return actionDownload(params);
  }

  render() {
    return (
      <div>
        <DownloadForm
          onSubmit={this.downloadContent}
        />
      </div>
    );
  }
}

export default connect(null, {
  xlsxReportDownloadAction,
  xlsxScheduleEmailAction,
})(ReportDownload);
