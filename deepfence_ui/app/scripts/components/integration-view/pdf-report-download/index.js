/*eslint-disable*/

import React from 'react';
import classnames from 'classnames';
import moment from 'moment';
import {Map} from 'immutable';
import {connect} from 'react-redux';
import DownloadForm from './pdf-report-form';
import {
  getPDFReportAction,
  getPdfDownloadStatusAction,
  downloadPdfReportAction,
} from '../../../actions/app-actions';
import Loader from '../../loader';
import pollable from '../../common/header-view/pollable';
import {objectValueExtractor} from '../../../utils/array-utils';
class PdfReportDownload extends React.Component {
  constructor(props) {
    super(props);
    this.getPdfDownloadStatus = this.getPdfDownloadStatus.bind(this);
    this.downloadContent = this.downloadContent.bind(this);
    this.downloadPdfReportFile = this.downloadPdfReportFile.bind(this);
    this.setResource = this.setResource.bind(this);
    this.state = {
      resource: 'cve',
    };
  }

  UNSAFE_componentWillMount() {
    const {
      registerPolling,
      startPolling,
    } = this.props;
    registerPolling(this.getPdfDownloadStatus);
    startPolling();
  }

  setResource(resourceType){
    this.setState({
      resource: resourceType,
    });
  }

  downloadContent(valuesParamsIm) {
    const {
      getPDFReportAction: actionDownload,
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
    const {
      node_type: nodeType,
      duration: durationStr,
      ...filterValues
    } = simpleValues;
    const duration = JSON.parse(durationStr);
    let params = {
      action: 'download_report',
      type: 'download_report',
      node_type: ["host", "container_image"],
      time_unit: duration.time_unit,
      number: duration.number,
      resource_type: this.state.resource,
      node_filters: {
        container_name: filterValues.container_name,
        image_name_with_tag: filterValues.image_name_with_tag,
        kubernetes_cluster_name: filterValues.kubernetes_cluster_name,
        host_name: filterValues.host_name,
      }
    };
    return actionDownload(params);
  }

  getPdfDownloadStatus(pollParams) {
    const {
      getPdfDownloadStatusAction: action,
    } = this.props;

    const {
      initiatedByPollable,
    } = pollParams;

    const params = {
      initiatedByPollable,
    };
    return action(params);
  }

  downloadPdfReportFile(path) {
    const {
      downloadPdfReportAction: action,
    } = this.props;

    const params = {
      path,
    };

    return action(params);
  }

  renderDownloadLink(pdfStatus = {}) {
    const {
      status,
      pdf_path: pdfFilePath,
    } = pdfStatus;

    const {
      fileDownloadStatusIm = Map(),
    } = this.props;

    const loading = fileDownloadStatusIm.getIn([pdfFilePath, 'loading']);

    if (status === 'Completed' && pdfFilePath) {
      return (
        <div>
          <span
            className={classnames('fa fa-download', { disabled: loading})}
            title="download"
            style={{cursor: 'pointer'}}
            onClick={() => { if (!loading) this.downloadPdfReportFile(pdfFilePath)}}
          />
          {loading}
          {loading && <Loader style={{top: '25%', fontSize: '2.0rem'}} />}
        </div>
      );
    }
    return null;
  }

  render() {
    const {
      tableItems = [],
    } = this.props;

    return (
      <div>
        <DownloadForm
          onSubmit={this.downloadContent}
          setResource={this.setResource}
        />
        <div className='email-integration-collection-wrapper'>
          <table className="table table-bordered table-striped">
            <thead>
              <th> Timestamp </th>
              <th> Report Type </th>
              <th> Filters Used </th>
              <th> Status </th>
              <th> Download </th>
            </thead>
            <tbody>
              {
                tableItems && tableItems.map((key) => (
                  <tr>
                    <td>{moment(key["@timestamp"]).format('MMMM Do YYYY, h:mm:ss a')}</td>
                    <td>{key.report_type === 'cve' ? 'vulnerability' : key.report_type}</td>
                    <td>{key.filters}</td>
                    <td>{key.status}</td>
                    <td>{this.renderDownloadLink(key)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      
    );
  }
}

const mapStateToProps = state => ({
  info: state.getIn(['pdfReportForm', 'form', 'info']),
  loading: state.getIn(['pdfReportForm', 'form', 'loading']),
  errorMessage: state.getIn(['pdfReportForm', 'form', 'error', 'message']),
  tableItems: state.getIn(['pdfReportForm', 'status', 'data']),
  initiatedByPollable: state.getIn(['pdfReportForm', 'status', 'initiatedByPollable']),
  fileDownloadStatusIm: state.getIn(['pdfReportForm', 'fileDownload']),
  statusLoading: state.getIn(['pdfReportForm', 'status', 'loading']),
});

export default connect(mapStateToProps, {
  getPDFReportAction,
  getPdfDownloadStatusAction,
  downloadPdfReportAction,
})
(pollable({
  pollingIntervalInSecs: 3,
})(PdfReportDownload));
