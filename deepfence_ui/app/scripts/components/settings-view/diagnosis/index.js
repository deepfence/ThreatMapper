/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/no-unused-state */
/* eslint-disable no-unused-vars */
import React from 'react';
import { connect } from 'react-redux';
import DFSelect from '../../common/multi-select/app';
import {
  getDiagnosticLogsAction,
  getAgentLogsAction,
  clearStateDiagnosticLogsAction,
  enumerateNodesAction,
} from '../../../actions/app-actions';
import HorizontalLoader from '../../common/app-loader/horizontal-dots-loader';
import DFSelectField from '../../common/multi-select/app-searchable-field';
import RunningNotification from '../../common/header-view/running-notification';

const loaderStyle = {
  top: '-110%',
  left: '40%',
};

class DiagnosisView extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      agentLogSelect: undefined,
      nodeIdList: [],
    };
    this.handleDownloadLogs = this.handleDownloadLogs.bind(this);
    this.handleAgentDownloadLogs = this.handleAgentDownloadLogs.bind(this);
    this.getFilters = this.getFilters.bind(this);
    this.agentLogDropDownChange = this.agentLogDropDownChange.bind(this);
  }

  getFilters() {
    const {
      enumerateNodesAction: action,
      // extraArgs are used to pass some specific information to the
      // API query params.
      extraArgs,
    } = this.props;

    const apiparams = {
      filters: {
        type: 'host',
        is_ui_vm: false,
        pseudo: false,
      },
      size: 10000,
      start_index: 0,
      fields: ['host_name', 'kubernetes_cluster_name'],
      ...extraArgs,
    };
    // override node_type if resourceType is passed explicitly
    return action(apiparams);
  }

  componentDidMount() {
    this.getFilters();
  }

  componentWillUnmount() {
    const { dispatchClearState } = this.props;
    dispatchClearState();
  }

  handleDownloadLogs() {
    const { dispatchGetDiagnosticLogs } = this.props;
    dispatchGetDiagnosticLogs();
  }

  handleAgentDownloadLogs() {
    const nodeIdArray = [];
    this.state.agentLogSelect.map(item => nodeIdArray.push(item.value));
    const { dispatchGetAgentDiagnosticLogs } = this.props;
    dispatchGetAgentDiagnosticLogs({ data: nodeIdArray });
  }

  agentLogDropDownChange(selected) {
    this.setState({
      agentLogSelect: selected,
    });
  }

  renderOne(filter) {
    const { something = '' } = this.props;
    const fieldName = 'host_name';
    const { multi_select: isMulti = true } = filter;
    filter = filter.filter(el => el.host_name !== 'The Internet');
    return (
      <div className="nodes-filter-item" key="host_name">
        <div className="df-select-field">
          {this.props.nodesIndex && (
            <DFSelect
              something={something}
              name={fieldName}
              component={DFSelectField}
              options={filter.map(option => ({
                label: option.host_name,
                value: option.id,
              }))}
              onChange={this.agentLogDropDownChange}
              value={this.state.agentLogSelect}
              buttonLabel={'Hostname'.label}
              placeholder="search"
              isMulti={isMulti}
              isSearchable
            />
          )}
        </div>
      </div>
    );
  }

  render() {
    const { loading = false, info } = this.props;
    return (
      <div className="container-fluid diagnosis-view row">
        <div className="col-sm-4 col-md-4 col-lg-4">
          <div
            className="align-items-start pl-0 pt-2 pb-2 "
            id="diagnostic_logs"
          >
            <div className="col pb-2">Diagnostic Logs</div>
            <div className="w-100" />
            <div className="col">
              <button
                type="button"
                className="btn-download"
                onClick={this.handleDownloadLogs}
                disabled={loading}
              >
                Download
                {loading && <HorizontalLoader style={loaderStyle} />}
              </button>
            </div>
          </div>
          <div className="align-items-start pl-0 pt-2 pb-2" id="agent_logs">
            <div className="col pb-2">Agent Logs</div>
            <div className="w-100" />
            <div className="col">
              {this.props.nodesIndex && this.renderOne(this.props.nodesIndex)}
            </div>
            <div className="w-100" />
            <div className="col">
              <button
                type="button"
                className="btn-download"
                onClick={this.handleAgentDownloadLogs}
                disabled={
                  this.state.agentLogSelect === undefined ||
                  this.state.agentLogSelect.length === 0 ||
                  loading
                }
              >
                Download
                {loading && <HorizontalLoader style={loaderStyle} />}
              </button>
            </div>

            <div className="w-100" />
            <div className="col">
              {info && <div className="error-message"> {info} </div>}
            </div>
          </div>
        </div>
        <div className="col-sm-4 col-md-4 col-lg-6">
          <div className="align-items-start pl-0 pt-2 pb-2 " id="system_status">
            <div className="pb-2">System status</div>
            <RunningNotification />
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  loading: state.getIn(['diagnostic_logs', 'download', 'loading']),
  info: state.getIn(['diagnostic_logs', 'download', 'info']),
  topologyFilters: state.getIn(['nodesView', 'topologyFilters']),
  nodesIndex: state.getIn(['nodesView', 'topologyNodes', 'host', 'data']),
});

export default connect(mapStateToProps, {
  enumerateNodesAction,
  dispatchGetDiagnosticLogs: getDiagnosticLogsAction,
  dispatchGetAgentDiagnosticLogs: getAgentLogsAction,
  dispatchClearState: clearStateDiagnosticLogsAction,
})(DiagnosisView);
