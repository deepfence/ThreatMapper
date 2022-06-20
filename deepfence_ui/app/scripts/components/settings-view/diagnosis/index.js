/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/no-unused-state */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
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

const DiagnosisView = props => {
  const [agentLogSelect, setAgentLogSelect] = useState(undefined);
  const { loading = false, info } = props;

  useEffect(() => {
    getFilters(props);
    const { clearStateDiagnosticLogsAction: dispatchClearState } = props;
    return () => {
      dispatchClearState();
    };
  }, []);

  const getFilters = props => {
    const {
      enumerateNodesAction: action,
      // extraArgs are used to pass some specific information to the
      // API query params.
      extraArgs,
    } = props;

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
  };

  const handleDownloadLogs = () => {
    const { getDiagnosticLogsAction: dispatchGetDiagnosticLogs } = props;
    dispatchGetDiagnosticLogs();
  };

  const handleAgentDownloadLogs = () => {
    const nodeIdArray = [];
    agentLogSelect.map(item => nodeIdArray.push(item.value));
    const { getAgentLogsAction: dispatchGetAgentDiagnosticLogs } = props;
    dispatchGetAgentDiagnosticLogs({ data: nodeIdArray });
  };

  const agentLogDropDownChange = selected => {
    setAgentLogSelect(selected);
  };

  const renderOne = filter => {
    const fieldName = 'host_name';
    const { multi_select: isMulti = true } = filter;
    filter = filter.filter(el => el.host_name !== 'The Internet');
    return (
      <div className="nodes-filter-item" key="host_name">
        <div className="df-select-field" style={{width: 'auto'}}>
          {props.nodesIndex && (
            <DFSelect
              name={fieldName}
              component={DFSelectField}
              options={filter.map(option => ({
                label: option.host_name,
                value: option.id,
              }))}
              onChange={agentLogDropDownChange}
              value={agentLogSelect}
              buttonLabel={'Hostname'.label}
              placeholder="search"
              isMulti={isMulti}
              isSearchable
              styles={{
                input: base => {
                  return {
                    ...base,
                    color: '#ffffff',
                    '& input': {
                      height: 'auto',
                    }
                  };
                },
              }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid diagnosis-view row">
      <div className="col-sm-4 col-md-4 col-lg-4">
        <div className="align-items-start pl-0 pt-2 pb-2 " id="diagnostic_logs">
          <div className="col pb-2">Diagnostic Logs</div>
          <div className="w-100" />
          <div className="col">
            <button
              type="button"
              className="btn-download"
              onClick={() => handleDownloadLogs()}
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
            {props.nodesIndex && renderOne(props.nodesIndex)}
          </div>
          <div className="w-100" />
          <div className="col">
            <button
              type="button"
              className="btn-download"
              onClick={() => handleAgentDownloadLogs()}
              disabled={
                agentLogSelect === undefined ||
                agentLogSelect.length === 0 ||
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
};

const mapStateToProps = state => ({
  loading: state.getIn(['diagnostic_logs', 'download', 'loading']),
  info: state.getIn(['diagnostic_logs', 'download', 'info']),
  topologyFilters: state.getIn(['nodesView', 'topologyFilters']),
  nodesIndex: state.getIn(['nodesView', 'topologyNodes', 'host', 'data']),
});

export default connect(mapStateToProps, {
  enumerateNodesAction,
  getDiagnosticLogsAction,
  getAgentLogsAction,
  clearStateDiagnosticLogsAction,
})(DiagnosisView);
