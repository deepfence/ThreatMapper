import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import moment from 'moment';
import { Redirect } from 'react-router-dom';
import { formValueSelector } from 'redux-form/immutable';
import ComplianceTestsView from './tests-container';
import ComplianceTestCategoryReportContainer from './test-category-report-container';
import ComplianceTestStatusReportContainer from './test-status-report-container';
import SideNavigation from '../common/side-navigation/side-navigation';
import HeaderView from '../common/header-view/header-view';
import {
  ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION,
} from '../../constants/menu-collection';
import { getUserRole } from '../../helpers/auth-helper';
import MaskFilterForm from './mask-filter-form';

class ComplianceDetailsView extends React.PureComponent {
  constructor(props) {
    super(props);
    this.sideNavMenuCollection =
      getUserRole() === 'admin'
        ? ADMIN_SIDE_NAV_MENU_COLLECTION
        : USER_SIDE_NAV_MENU_COLLECTION;
    this.state = {
      activeMenu: this.sideNavMenuCollection[0],
      redirectBack: false,
      refreshCounter: 0,
    };
    this.handleBackButton = this.handleBackButton.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.hideMasked !== this.props.hideMasked) {
      this.onRowActionCallback();
    }
  }

  handleBackButton(checkType) {
    this.setState({
      redirectBack: true,
      link: `/compliance/summary/${checkType}?b`,
    });
  }

  onRowActionCallback = () => {
    this.setState(state => {
      return {
        refreshCounter: state.refreshCounter + 1,
      };
    });
  };

  render() {
    const { redirectBack, link } = this.state;
    if (redirectBack) {
      return <Redirect to={link} />;
    }

    const { match: { params: { scanId, nodeId, checkType, scanType } = {} } = {} } =
      this.props;

    // parsing node id from scan_id
    // scan_id format <compliance check type>_<node id>_<scan time string>
    // text between 1st underscore and last underscore is the nodeID
    // Also removing checktype from scan id because the underscore
    // in checktype messes with the logic
    const scanIdWithoutChecktype = scanId.replace(checkType, '');
    const lastUnderscoreIndex = scanIdWithoutChecktype.lastIndexOf('_');
    const timeOfScanStr = scanIdWithoutChecktype.substring(
      lastUnderscoreIndex + 1
    );
    const timeOfScan = moment.utc(timeOfScanStr);

    const { isSideNavCollapsed, isFiltersViewVisible } = this.props;
    const divClassName = classnames(
      { 'collapse-side-nav': isSideNavCollapsed },
      { 'expand-side-nav': !isSideNavCollapsed }
    );
    const contentClassName = classnames('navigation', {
      'with-filters': isFiltersViewVisible,
    });
    const scanIdFormatted = scanId.split('_')[0];

    const urlSearchParams = new URLSearchParams(
      this.props.location?.search ?? ''
    );

    const { location } = this.props;
    const cloudTypeCheck = scanType;

    return (
      <div className="compliance-details">
        <SideNavigation
          navMenuCollection={this.sideNavMenuCollection}
          activeMenu={this.state.activeMenu}
        />
        <div className={divClassName}>
          <HeaderView />
          <div className="" style={{ paddingTop: '64px' }} />
          {cloudTypeCheck === 'kubernetes' && (
            <div
              className="go-back-btn"
              style={{
                marginBottom: '8px',
                width: 'fit-content',
                cursor: 'pointer',
              }}
              onClick={() => {
                this.props.history.push(
                  `/compliance/${cloudTypeCheck}/${scanIdFormatted}/standard/${this.props.match.params.checkType}`
                );
              }}
            >
              <i className="fa fa-arrow-left" aria-hidden="true" />{' '}
              <span
                style={{
                  paddingLeft: '5px',
                  color: '#0276C9',
                  fontSize: '15px',
                }}
              >
                {' '}
                Go Back
              </span>
            </div>
          )}
          {cloudTypeCheck !== 'kubernetes' &&
          !urlSearchParams.get('resource') &&
          location.state === undefined ? (
            <div
              className="go-back-btn"
              style={{
                marginBottom: '8px',
                width: 'fit-content',
                cursor: 'pointer',
              }}
              onClick={() => {
                this.props.history.push(
                  `/compliance/${cloudTypeCheck}/${nodeId}/standard/${this.props.match.params.checkType}`
                );
              }}
            >
              <i className="fa fa-arrow-left" aria-hidden="true" />{' '}
              <span
                style={{
                  paddingLeft: '5px',
                  color: '#0276C9',
                  fontSize: '15px',
                }}
              >
                {' '}
                Go Back
              </span>
            </div>
          ) : null}
          {cloudTypeCheck !== 'kubernetes' &&
            urlSearchParams.get('resource')?.length &&
            urlSearchParams.get('serviceId')?.length && (
              <div
                className="go-back-btn"
                style={{
                  marginBottom: '8px',
                  width: 'fit-content',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  this.props.history.push(
                    `/compliance/cloud-inventory/${cloudTypeCheck}/${nodeId}/${urlSearchParams.get(
                      'serviceId'
                    )}`
                  );
                }}
              >
                <i className="fa fa-arrow-left" aria-hidden="true" />{' '}
                <span
                  style={{
                    paddingLeft: '5px',
                    color: '#0276C9',
                    fontSize: '15px',
                  }}
                >
                  {' '}
                  Go Back
                </span>
              </div>
            )}
          <div
            className={`report ${
              this.props.isFiltersViewVisible
                ? 'collapse-fixed-panel-header'
                : ''
            }`}
          >
            <div className="test-status-report test-status-report-comliance">
              <ComplianceTestStatusReportContainer
                nodeId={nodeId}
                scanId={scanId}
                checkType={checkType}
                timeOfScan={timeOfScan}
                cloudType={cloudTypeCheck}
                resource={urlSearchParams.get('resource')}
                refreshCounter={this.state.refreshCounter}
              />
            </div>
            <div className="test-category-report test-category-report-compliance">
              <ComplianceTestCategoryReportContainer
                nodeId={nodeId}
                scanId={scanId}
                checkType={checkType}
                cloudType={cloudTypeCheck}
                resource={urlSearchParams.get('resource')}
                refreshCounter={this.state.refreshCounter}
              />
            </div>
          </div>
          <div className="table">
            <div className="compliance-table">
              <div className="table-title absolute">
                <span>Compliance Tests</span>
              </div>
              <div className="mask-filter absolute">
                <MaskFilterForm />
              </div>
            </div>
            <ComplianceTestsView
              nodeId={nodeId}
              scanId={scanId}
              checkType={checkType}
              cloudType={cloudTypeCheck}
              resource={urlSearchParams.get('resource')}
              onRowActionCallback={this.onRowActionCallback}
            />
          </div>
          <div className={contentClassName} />
        </div>
      </div>
    );
  }
}

const maskFormSelector = formValueSelector('compliance-mask-filter-form');

function mapStateToProps(state) {
  return {
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    cloudType: state.get('compliance_node_type'),
    isFiltersViewVisible: state.get('isFiltersViewVisible'),
    hideMasked: maskFormSelector(state, 'hideMasked') ?? true,
  };
}

export default connect(mapStateToProps)(ComplianceDetailsView);
