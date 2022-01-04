/*eslint-disable*/
import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import JSONView from './json-view';
import KeyValuePairTable from './key-value-pair-table';
import { getUserRole } from "../../../helpers/auth-helper";
import { excludeKeys } from '../../../utils/array-utils';
import HorizontalLoader from '../app-loader/horizontal-dots-loader';
import { DagreGraph, formatApiDataForDagreGraph } from '../../common/dagre-graph';
import { getDocTopAttackPathsAction } from "../../../actions/app-actions";

class Tabs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isTableViewVisible: true,
      isJSONViewVisible: false,
      showDisableRuleButton: false,
      showEnableRuleButton: false,
    }
    this.toggleTabView = this.toggleTabView.bind(this);
    this.saveRule = this.saveRule.bind(this);
    this.disableAlertRule = this.disableAlertRule.bind(this);
    this.enableAlertRule = this.enableAlertRule.bind(this);
    this.copyToClipboard = this.copyToClipboard.bind(this);
  }

  componentDidMount() {
    const {
      data: {
        _source: {
          resource_type: alertResourceType,
          masked: maskedStr = "false",
          node_type: nodeType,
          doc_id: docId,
          type
        } = {},
      } = {},
    } = this.props;

    const masked = JSON.parse(maskedStr)

    this.setState({ showDisableRuleButton: alertResourceType === 'network' && !masked });
    this.setState({ showEnableRuleButton: alertResourceType === 'network' && masked });

    if (type === 'cve' && ['container_image', 'host'].includes(nodeType)) {
      this.props.dispatch(getDocTopAttackPathsAction({
        docId
      }));
    }
  }
  componentDidUpdate(prevProp) {
    if (this.props.isDisabled !== prevProp.isDisabled) {
      this.setState({ showDisableRuleButton: !this.props.isDisabled });
      this.setState({ showEnableRuleButton: this.props.isDisabled });
    }
  }
  // this function will be only be called/used when the component is wrapped inside
  // onClickOutside HOC(high order component), it is react library which monitors the outside
  // div clicks and performs desired functions.
  handleClickOutside(e) {
    this.props.onClickClose();
  };

  copyToClipboard() {
    const {
      data: {
        _source: doc = {},
      },
      toaster,
    } = this.props;
    navigator.clipboard.writeText(JSON.stringify(doc)).then(() => {
      toaster('JSON copied to clipboard');
    }, (error) => {
      console.log(error);
      toaster('ERROR: There was an error copying to the clipboard');
    });
  }

  disableAlertRule() {
    const {
      maskDocs,
      data: {
        _id: id,
        _index: index,
        _type: type,
        _source: {
          summary: alertSummary,
          classtype,
        } = {},
      } = {},
    } = this.props;

    const params = {
      _id: id,
      _index: index,
      _type: type,
      summary: alertSummary,
      classtype: classtype,
    };

    maskDocs(params);
  }

  enableAlertRule() {
    const {
      unmaskDocs,
      data: {
        _source: {
          signature_id,
        }
      } = {},
    } = this.props;

    const params = {
      signatureId: signature_id,
    };
    unmaskDocs(params);
  }

  saveRule() {
    const {
      saveClusteringRule,
      data: {
        _source: {
          summary: alertSummary,
          signature_id,
          classtype,
        } = {},
      } = {},
    } = this.props;
    const params = {
      rule_name: `${classtype} Cluster`,
      node_type: "infra_wide",
      on_summary: alertSummary,
      on_signature_id: signature_id,
      run_interval_minutes: 1,
      no_of_alerts: 2,
    };
    saveClusteringRule(params);
  }

  toggleTabView(e) {
    if (e.target.innerHTML === 'table') {
      this.setState({ isTableViewVisible: true });
      this.setState({ isJSONViewVisible: false });
    }
    else {
      this.setState({ isTableViewVisible: false });
      this.setState({ isJSONViewVisible: true });
    }
  }

  manipulateJSONResponse(responseData) {
    const userRole = getUserRole();
    const fieldsToBeHidden = ['type', 'resolved', 'signature_id', 'cve_overall_score'];
    if (userRole !== 'admin') {
      fieldsToBeHidden.push('payload_printable');
    }
    const response = {
      ...responseData,
      _source: excludeKeys(responseData['_source'], fieldsToBeHidden),
    };
    return response._source;
  }

  manipulateTableResponse(responseData) {
    const userRole = getUserRole();
    const fieldsToBeHidden = ['type', 'resolved', 'signature_id', '@version', 'cve_overall_score', 'cve_id_cve_severity_cve_container_image'];
    if (userRole !== 'admin') {
      fieldsToBeHidden.push('payload_printable');
    }
    const response = {
      ...responseData,
      _source: excludeKeys(responseData['_source'], fieldsToBeHidden),
    };
    return response;
  }

  render() {
    const {
      partial,
      disableAlertRuleRequestLoading = false,
      enableAlertRuleRequestLoading = false,
    } = this.props;
    const tabClassName = classnames('tab-content',
      {
        partial: partial,
      },
      {
        'json-background': !this.state.isTableViewVisible,
      },
    );
    const tabsViewWrapper = {
      height: '100%',
    }
    const tabCollection = {
      textAlign: 'left',
      zIndex: 9999,
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between'
    }
    let tabEle = null;
    if (this.state.isTableViewVisible) {
      tabEle = (
        <div id="tab1" className={tabClassName}>
          <KeyValuePairTable data={this.manipulateTableResponse(this.props.data)} />
          {/* <AlertCorrelationView
                      data={this.props.correlationData}
                      loading={this.props.loading}
          /> */}
        </div>
      );
    } else {
      tabEle = (
        <div id="tab2" className={tabClassName}>
          <JSONView data={this.manipulateJSONResponse(this.props.data)} />
        </div>
      );
    }

    const {
      data: {
        _source: {
          user_defined_classtype: userDefinedClasstype,
          resource_type: alertResourceType,
          classtype: classtype,
          masked: maskedStr = "false",
          node_type: nodeType,
          type
        } = {},
      } = {},
      topAttackPathsForDoc,
      topAttackPathsForDocLoading
    } = this.props;

    const masked = JSON.parse(maskedStr)

    const showGroupButton = !userDefinedClasstype && partial && !["Inbound Connection Anomaly", "Outbound Connection Anomaly", "CPU Anomaly", "Memory Anomaly", "Spike in Outbound Connection", "Spike in Inbound Connection"].includes(classtype);

    const showAttackPath = (type === 'cve')
      && ['container_image', 'host'].includes(nodeType)
      && !topAttackPathsForDocLoading;
    const attackPathDataExist =
      topAttackPathsForDoc
      && topAttackPathsForDoc.attack_path
      && topAttackPathsForDoc.attack_path.length

    return (
      <div style={tabsViewWrapper}>
        <ul className="tabs-collection" style={tabCollection}>
          <div>
            <li className={'tab ' + (this.state.isTableViewVisible ? 'active' : 'in-active')}>
              <span onClick={this.toggleTabView}>table</span>
            </li>
            <li className={'tab ' + (this.state.isJSONViewVisible ? 'active' : 'in-active')}>
              <span onClick={this.toggleTabView}>json</span>
            </li>
          </div>
          <div className="tabs-header-button" style={{ display: 'flex' }}>
            <button
              className="primary-btn"
              onClick={this.copyToClipboard}
              title="Copy to clipboard"
            >
              <i className="fa fa-copy" />
              Copy
            </button>
            {showGroupButton && <button
              className="primary-btn"
              onClick={this.saveRule}
              title="Group Similar Alerts"
            >
              <i className="fa fa-chain" />
              Group
            </button>}
            {this.state.showDisableRuleButton && <button
              className="primary-btn relative"
              onClick={this.disableAlertRule}
              title="Disable rule for current alert"
              disabled={disableAlertRuleRequestLoading}
            >
              <i className="fa fa-eye-slash" />
              Disable Alert
              {disableAlertRuleRequestLoading &&
                <HorizontalLoader style={{ top: '-105%', left: '40%' }} />}
            </button>}
            {this.state.showEnableRuleButton && <button
              className="primary-btn relative"
              onClick={this.enableAlertRule}
              title="Enable Rule for current alert"
              disabled={enableAlertRuleRequestLoading}
            >
              <i className="fa fa-eye" />

              Enable Alert
              {enableAlertRuleRequestLoading &&
                <HorizontalLoader style={{ top: '-105%', left: '40%' }} />}
            </button>}
            <div className="close-btn" style={{ cursor: 'pointer', marginLeft: '10px', marginTop: '8px' }} onClick={this.props.onClickClose}>
              <i className="fa fa-times" aria-hidden="true" />
            </div>
          </div>
        </ul>
        <div className="timestapmdate">
          {this.props.data._source['summary']}
        </div>
        <div>
          <div className={classnames("tab-folder", {
            "with-attack-paths": showAttackPath
          })}>
            {tabEle}
          </div>
          {
            showAttackPath ? (
              <div className="vlun-path-container">
                <div className="vlun-path-graph-title">Top 5 Attack Paths</div>
                {
                  attackPathDataExist ? (
                    <DagreGraph
                      data={formatApiDataForDagreGraph(topAttackPathsForDoc)}
                      height={500}
                    />
                  ) : (
                    <div className="vlun-path-no-data">No attack paths exist</div>
                  )
                }
              </div>
            ) : null
          }

        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    disableAlertRuleRequestLoading: state.getIn(['disable_alert_rule', 'loading']),
    enableAlertRuleRequestLoading: state.getIn(['enable_alert_rule', 'loading']),
    isDisabled: state.getIn(['rule', 'isDisabled']),
    topAttackPathsForDoc: state.getIn(['topAttackPathsForDoc', 'data']),
    topAttackPathsForDocLoading: state.getIn(['topAttackPathsForDoc', 'status', 'loading'])
  };
}
export default connect(mapStateToProps)(Tabs);
