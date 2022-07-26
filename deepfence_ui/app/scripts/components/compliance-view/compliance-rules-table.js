/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable react/no-unused-state */
import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import {
  getComplianceTestsAction,
  updateComplianceTestsAction,
  toaster,
  startComplianceScanAction,
  complianceScheduleScanAction,
  hideModal,
} from '../../actions/app-actions';
import NotificationToaster from '../common/notification-toaster/notification-toaster';
import withMultiSelectColumn from '../common/df-table/with-multi-select-column';
import RulesTable from './rules-table';

class ComplianceRulesTable extends React.Component {
  constructor(props) {
    super(props);
    let activeTab = '';

    if (props.cloudType === 'aws') {
      activeTab = 'cis';
    } else if (props.cloudType === 'google_cloud') {
      activeTab = 'cis';
    } else if (props.cloudType === 'azure') {
      activeTab = 'cis';
    } else if (props.cloudType === 'linux') {
      activeTab = 'hipaa';
    } else if (props.cloudType === 'kubernetes') {
      activeTab = 'hipaa';
    }

    this.state = {
      activeTab,
      checked: '',
      checkBoxes: [],
      scheduleScanIntervel: null,
    };
    this.renderActiveTabContent = this.renderActiveTabContent.bind(this);
    this.setActiveTab = this.setActiveTab.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSceduleScanChange = this.handleSceduleScanChange.bind(this);
    this.startComplianceScan = this.startComplianceScan.bind(this);
    this.startComplianceScheduleScan =
      this.startComplianceScheduleScan.bind(this);
  }

  handleSceduleScanChange(event) {
    this.setState({ scheduleScanIntervel: event.target.value });
  }

  startComplianceScan() {
    const { checkBoxes } = this.state;
    const { nodeId, cloudType } = this.props;
    this.props.dispatch(
      startComplianceScanAction({ cloudType, nodeId, checkBoxes })
    );
    this.props.dispatch(hideModal());
    this.props.dispatch(toaster(this.props.scanMessage));
  }

  startComplianceScheduleScan() {
    const { scheduleScanIntervel, checkBoxes } = this.state;
    const { nodeId, cloudType } = this.props;
    this.props.dispatch(
      complianceScheduleScanAction({
        nodeId,
        cloudType,
        checkBoxes,
        scheduleScanIntervel,
      })
    );
    this.props.dispatch(hideModal());
    this.props.dispatch(toaster(this.props.scheduleScanMessage));
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const { info: newInfo, error: newError } = newProps;

    const {
      info: currentInfo,
      error: currentError,
      toaster: toasterAction,
    } = this.props;

    if (newInfo || newError) {
      if (currentInfo !== newInfo) {
        toasterAction(newInfo);
      }
      if (currentError !== newError) {
        toasterAction(newError);
      }
    }
  }

  setActiveTab(tabId) {
    this.setState({
      activeTab: tabId,
    });
  }

  renderActiveTabContent() {
    const { activeTab } = this.state;

    const { cloudType, nodeId } = this.props;
    switch (activeTab) {
      case 'cis': {
        return (
          <RulesTable checkType="cis" cloudType={cloudType} nodeId={nodeId} />
        );
      }
      case 'gdpr': {
        return (
          <RulesTable checkType="gdpr" cloudType={cloudType} nodeId={nodeId} />
        );
      }
      case 'hipaa': {
        return (
          <RulesTable checkType="hipaa" cloudType={cloudType} nodeId={nodeId} />
        );
      }
      case 'pci': {
        return (
          <RulesTable checkType="pci" cloudType={cloudType} nodeId={nodeId} />
        );
      }
      case 'soc2': {
        return (
          <RulesTable checkType="soc2" cloudType={cloudType} nodeId={nodeId} />
        );
      }
      case 'nist': {
        return (
          <RulesTable checkType="nist" cloudType={cloudType} nodeId={nodeId} />
        );
      }
      default: {
        return null;
      }
    }
  }

  handleChange(event) {
    const { checkBoxes } = this.state;
    const arr = [];
    if (event.target.checked) {
      checkBoxes.push(event.target.value);
    } else {
      checkBoxes.splice(arr.indexOf(event.target.value), 1);
    }
    this.setState({
      checked: checkBoxes.includes(event.target.value),
    });
  }

  render() {
    const { cloudType, isToasterVisible } = this.props;
    const { scheduleScanIntervel } = this.state;
    let disabledCheck = true;
    if (this.state.checkBoxes.length > 0) {
      if (scheduleScanIntervel >= 1) disabledCheck = false;
    } else if (scheduleScanIntervel >= 1) {
      if (this.state.checkBoxes.length > 0) {
        disabledCheck = false;
      }
    } else disabledCheck = true;
    let tabCategoryList = [];

    const awsCheckTypes = [
      {
        id: 'cis',
        displayName: 'CIS',
      },
      {
        id: 'gdpr',
        displayName: 'GDPR',
      },
      {
        id: 'hipaa',
        displayName: 'HIPAA',
      },
      {
        id: 'pci',
        displayName: 'PCI',
      },
      {
        id: 'soc2',
        displayName: 'SOC2',
      },
      {
        id: 'nist',
        displayName: 'NIST',
      },
    ];

    const azureCheckType = [
      {
        id: 'cis',
        displayName: 'CIS',
      },
      {
        id: 'hipaa',
        displayName: 'HIPAA',
      },
      {
        id: 'nist',
        displayName: 'NIST',
      },
    ];

    const linuxCheckType = [
      {
        id: 'hipaa',
        displayName: 'HIPAA',
      },
      {
        id: 'gdpr',
        displayName: 'GDPR',
      },
      {
        id: 'pci',
        displayName: 'PCI',
      },
      {
        id: 'nist',
        displayName: 'NIST',
      },
    ];

    const kubernetesCheckType = [
      {
        id: 'hipaa',
        displayName: 'HIPAA',
      },
      {
        id: 'gdpr',
        displayName: 'GDPR',
      },
      {
        id: 'pci',
        displayName: 'PCI',
      },
      {
        id: 'nist',
        displayName: 'NIST',
      },
    ];

    const gcpCheckTypes = [
      {
        id: 'cis',
        displayName: 'CIS',
      },
    ];

    if (cloudType === 'aws') {
      tabCategoryList = awsCheckTypes;
    } else if (cloudType === 'google_cloud') {
      tabCategoryList = gcpCheckTypes;
    } else if (cloudType === 'azure') {
      tabCategoryList = azureCheckType;
    } else if (cloudType === 'linux') {
      tabCategoryList = linuxCheckType;
    } else if (cloudType === 'kubernetes') {
      tabCategoryList = kubernetesCheckType;
    }

    return (
      <div
        style={{
          height: '100%'
        }}
      >
        <div className="alerts-view-switcher-wrapper">
          <div className="df-tabs" style={{ marginTop: '0px' }}>
            <div
              className="tabs-wrapper tabheading"
              style={{
                color: 'white',
                display: 'flex',
                fontSize: '20px',
                paddingLeft: '20px',
              }}
            >
              {tabCategoryList.map(el => (
                <React.Fragment key={el?.id}>
                  <input
                    type="checkbox"
                    style={{ marginTop: '5px' }}
                    id={el.id}
                    value={el.id}
                    checked={this.state.checkBoxes.includes(el.id)}
                    onChange={this.handleChange}
                  />
                  <li
                    key={el.id}
                    className={classnames('tab', {
                      active: el.id === this.state.activeTab,
                    })}
                    onClick={() => this.setActiveTab(el.id)}
                  >
                    {el.displayName}
                  </li>
                </React.Fragment>
              ))}
              <input
                style={{
                  fontSize: '14px',
                  marginRight: '20px',
                  marginLeft: 'auto',
                }}
                type="number"
                id="schedule_scan"
                name="Schedule Scan"
                placeholder="Scan Interval in days (optional)"
                value={scheduleScanIntervel || ''}
                onChange={this.handleSceduleScanChange}
              />
              <button
                className="primary-btn"
                type="submit"
                style={{
                  display: 'flex',
                  marginRight: '20px',
                  justifyContent: 'center',
                }}
                disabled={disabledCheck}
                onClick={() => this.startComplianceScheduleScan()}
              >
                Start Schedule Scan
              </button>
              <button
                className="primary-btn"
                type="submit"
                style={{
                  display: 'flex',
                  marginRight: '20px',
                  justifyContent: 'center',
                }}
                disabled={this.state.checkBoxes.length === 0}
                onClick={() => this.startComplianceScan()}
              >
                Start Scan
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '50px', marginLeft: '-25px' }}>
          {this.renderActiveTabContent()}
        </div>
        {isToasterVisible && <NotificationToaster />}
      </div>
    );
  }
}

const mapStateToProps = (state, { complianceChecktype }) => ({
  complianceRules: state.get('compliance_rules'),
  scanMessage: state.get('compliance_start_scan'),
  scheduleScanMessage: state.get('compliance_schedule_scan_error'),
  complianceTests: state.getIn(
    ['compliance', 'compliance_tests', 'data', complianceChecktype],
    []
  ),
  error: state.getIn([
    'compliance',
    'compliance_tests',
    'error',
    complianceChecktype,
  ]),
  info: state.getIn([
    'compliance',
    'compliance_tests',
    'info',
    complianceChecktype,
  ]),
  isToasterVisible: state.get('isToasterVisible'),
});

export default connect(mapStateToProps, {
  getComplianceTestsAction,
  updateComplianceTestsAction,
  toaster,
})(
  withMultiSelectColumn({
    name: 'compliance-tests',
    column: {
      name: 'Action',
      accessor: 'id',
      maxWidth: 140,
    },
  })(ComplianceRulesTable)
);
