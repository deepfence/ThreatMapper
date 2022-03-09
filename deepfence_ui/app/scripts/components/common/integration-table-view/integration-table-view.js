/* eslint-disable no-unused-vars */

// React imports
import React from 'react';
import ReactTooltip from 'react-tooltip';
import { NOTIFICATION_RESOURCE_OPTIONS } from '../../../constants/dropdown-option-collection';

const resourceValueIndex = NOTIFICATION_RESOURCE_OPTIONS.reduce((acc, el) => {
  acc[el.value] = el.label;
  return acc;
}, {});

const IntegrationTableView = props => {
  const getTableHeaderView = () => {
    const { recordCollection } = props;
    const record = recordCollection[0];
    return (
      <tr style={{ border: 'none' }}>
        <th>status</th>
        {record.notification_type && <th> Resource </th>}
        {record.error_msg && <th> Status </th>}
        {record.email && <th>Email</th>}
        {record.channel && <th>Channel</th>}
        {record.webhook_url && <th>Webhook url</th>}
        {record.service_key && <th>Integration key</th>}
        {record.access_token && <th>Access Token</th>}
        {record.node_type && <th>Node Type</th>}
        {record.alert_level !== undefined && <th>Severity</th>}
        {record.action && <th>Operation</th>}
        {record.api_url && <th>API Endpoint</th>}
        {record.es_url && <th>ES Endpoint</th>}
        {record.index && <th>ES Index</th>}
        {record.doc_type && <th>ES Doc Type</th>}
        {record.s3_bucket && <th>S3 Bucket</th>}
        {record.folder_path && <th>S3 Folder</th>}
        {record.aws_access_key && <th>AWS Access Key</th>}
        {record.duration_in_mins && <th>Duration</th>}
        {record.jira_site_url && <th>Jira Site URL </th>}
        {record.jira_project_key && <th> Jira Project Key </th>}
        {record.username && <th> Username </th>}
        {record.issue_type && <th> Issue Type </th>}
        <th> Tags </th>
        <th> Kube Cluster </th>
        <th> Kube Namespace </th>
        <th style={{ textAlign: 'center' }}>Action</th>
      </tr>
    );
  };

  const getTableView = () => {
    const { recordCollection } = props;
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
              <div className="green-dot" />
            )}
          </td>
          {record.notification_type && (
            <td style={workBreakStyles}>
              {' '}
              {resourceValueIndex[record.notification_type]}{' '}
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
          {record.alert_level !== undefined && <td>{record.alert_level}</td>}
          {record.api_url && (
            <td
              className="truncate"
              style={wideColumnStyles}
              title={record.api_url}
            >
              {record.api_url}
            </td>
          )}
          {record.es_url && <td>{record.es_url}</td>}
          {record.index && <td>{record.index}</td>}
          {record.doc_type && <td>{record.doc_type}</td>}
          {record.s3_bucket && <td>{record.s3_bucket}</td>}
          {record.folder_path && <td>{record.folder_path}</td>}
          {record.aws_access_key && <td>{record.aws_access_key}</td>}
          {record.action && <td>{record.action}</td>}
          {record.duration_in_mins && (
            <td style={workBreakStyles}>
              {Number(record.duration_in_mins) > 0
                ? `Every ${record.duration_in_mins} minutes`
                : 'Immediate'}
            </td>
          )}
          {record.jira_site_url && <td>{record.jira_site_url}</td>}
          {record.jira_project_key && <td>{record.jira_project_key}</td>}
          {record.username && <td>{record.username}</td>}
          {record.issue_type && <td>{record.issue_type}</td>}
          <td> {userDefinedTags.join(', ')} </td>
          <td> {kubeCluster.join(', ')} </td>
          <td> {kubeNamespace.join(', ')} </td>
          <td className="text-center">
            <i
              className="fa fa-trash-o"
              style={deleteBtnStyles}
              aria-hidden="true"
              onClick={() => deleteIntegration(record)}
            />
          </td>
        </tr>
      );
    });
  };

  const deleteIntegration = record => {
    props.onDeleteRequestCallback(record);
  };

  return (
    <div className="email-integration-collection-wrapper">
      <table className="table">
        <thead>{getTableHeaderView()}</thead>
        <tbody>{getTableView()}</tbody>
      </table>
    </div>
  );
};

export default IntegrationTableView;
