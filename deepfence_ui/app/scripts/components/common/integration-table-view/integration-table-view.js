/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import ReactTooltip from 'react-tooltip';
import { requestIntegrationDelete } from '../../../actions/app-actions';
import { NOTIFICATION_RESOURCE_OPTIONS } from '../../../constants/dropdown-option-collection';

const resourceValueIndex = NOTIFICATION_RESOURCE_OPTIONS.reduce((acc, el) => {
  acc[el.value] = el.label;
  return acc;
}, {});

class IntegrationTableView extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  getTableHeaderView() {
    const { recordCollection } = this.props;
    const record = recordCollection[0];
    return (
      <tr style={{ border: 'none' }}>
        <th>status</th>
        {record.notification_type && <th style={{minWidth: '180px'}}> Resource </th>}
        {record.email && <th>Email</th>}
        {record.channel && <th>Channel</th>}
        {record.webhook_url && <th>Webhook url</th>}
        {record.service_key && <th>Integration key</th>}
        {record.access_token && <th>Access Token</th>}
        {record.node_type && <th>Node Type</th>}
        {record.alert_level != undefined && <th>Severity</th>}
        {record.action && <th>Operation</th>}
        {record.api_url && <th>API Endpoint</th>}
        {record.es_url && <th>ES Endpoint</th>}
        {record.index && <th>ES Index</th>}
        {record.doc_type && <th>ES Doc Type</th>}
        {record.s3_bucket && <th>S3 Bucket</th>}
        {record.folder_path && <th>S3 Folder</th>}
        {record.aws_access_key && <th>AWS Access Key</th>}
        {record.duration_in_mins && <th style={{minWidth: '105px'}}>Duration</th>}
        {record.jira_site_url && <th>Jira Site URL </th>}
        {record.jira_project_key && <th> Jira Project Key </th>}
        {record.username && <th> Username </th>}
        {record.issue_type && <th> Issue Type </th>}
        {record.filters && <th> Filters </th>}
        {/*<th> Hosts </th>
        <th> Images </th> */}
        <th> Tags </th>
        <th> Kube Cluster </th>
        <th> Kube Namespace </th>
        <th style={{ textAlign: 'center' }}>Action</th>
      </tr>
    );
  }

  getTableView() {
    const { recordCollection } = this.props;
    const deleteBtnStyles = {
      color: '#db2547',
      cursor: 'pointer',
    };
    const workBreakStyles = {
      wordBreak: 'break-all',
    };
    const wideColumnStyles = {
      maxWidth: '200px',
    };
    return recordCollection.map(record => {
      const {
        filters: {
          user_defined_tags: userDefinedTags = [],
          kubernetes_cluster_name: kubeCluster = [],
          kubernetes_namespace: kubeNamespace = [],
          host_name: hostname = [],
          image_name: imagename = [],
        } = {},
      } = record;
      return (
        <tr key={`${record.id}-${record.notification_type}`}>
          <td>
            {record.error_msg ? (
              <div className="red-dot" data-tip={record.error_msg}>
                <ReactTooltip type="dark" effect="solid" place="right" />
              </div>
            ) : (
              <div className="green-dot"></div>
            )}
          </td>
          {record.notification_type && (
            <td style={workBreakStyles}>
              {' '}
              {resourceValueIndex[record.notification_type] === undefined
                ? 'Cloudtrail Alerts'
                : resourceValueIndex[record.notification_type]}{' '}
            </td>
          )}
          {record.email && <td style={workBreakStyles}>{record.email}</td>}
          {record.channel && <td style={workBreakStyles}>{record.channel}</td>}
          {record.webhook_url && (
            <td style={workBreakStyles} className="" title={record.webhook_url}>
              {record.webhook_url}
            </td>
          )}
          {record.service_key && (
            <td style={workBreakStyles}>{record.service_key}</td>
          )}
          {record.access_token && (
            <td style={workBreakStyles}>{record.access_token}</td>
          )}
          {record.node_type && (
            <td style={workBreakStyles}>{record.node_type}</td>
          )}
          {record.alert_level != undefined && <td>{record.alert_level}</td>}
          {record.api_url && (
            <td
              className="truncate"
              style={wideColumnStyles}
              data-tip={record.api_url}
            >
              <ReactTooltip type="dark" effect="solid" place="bottom" />
              {record.api_url}
            </td>
          )}
          {record.es_url && <td>{record.es_url}</td>}
          {record.index && <td>{record.index}</td>}
          {record.doc_type && <td>{record.doc_type}</td>}
          {record.s3_bucket && <td>{record.s3_bucket}</td>}
          {record.folder_path && <td>{record.folder_path}</td>}
          {record.aws_access_key && <td>{record.aws_access_key}</td>}
          {record.duration_in_mins && (
            <td style={workBreakStyles}>
              {Number(record.duration_in_mins) > 0
                ? 'Every ' + record.duration_in_mins + ' minutes'
                : 'Immediate'}
            </td>
          )}
          {record.jira_site_url && <td>{record.jira_site_url}</td>}
          {record.jira_project_key && <td>{record.jira_project_key}</td>}
          {record.username && <td>{record.username}</td>}
          {record.issue_type && <td>{record.issue_type}</td>}
          {record.filters.length > 0 && (
            <td
              className="truncate"
              style={wideColumnStyles}
              data-tip={JSON.stringify(record.filters)}
            >
              <ReactTooltip type="dark" effect="solid" place="bottom" />
              {JSON.stringify(record.filters)}
            </td>
          )}
          {/*<td> {hostname.join(', ')} </td>
            <td> {imagename.join(', ')} </td>*/}
          <td> {userDefinedTags.join(', ')} </td>
          <td> {kubeCluster.join(', ')} </td>
          <td> {kubeNamespace.join(', ')} </td>
          {record.action && <td>{record.action}</td>}
          <td className="text-center">
            <i
              className="fa fa-trash-o"
              style={deleteBtnStyles}
              aria-hidden="true"
              onClick={() => this.deleteIntegration(record)}
            ></i>
          </td>
        </tr>
      );
    });
  }

  deleteIntegration(record) {
    this.props.onDeleteRequestCallback(record);
  }

  render() {
    return (
      <div className="email-integration-collection-wrapper">
        <table className="table">
          <thead>{this.getTableHeaderView()}</thead>
          <tbody>{this.getTableView()}</tbody>
        </table>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {};
}

export default connect(mapStateToProps)(IntegrationTableView);
