import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import moment from 'moment';
import { Redirect } from 'react-router-dom';
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
    };
    this.handleBackButton = this.handleBackButton.bind(this);
  }

  handleBackButton(checkType) {
    this.setState({
      redirectBack: true,
      link: `/compliance/summary/${checkType}?b`,
    });
  }

  render() {
    const { redirectBack, link } = this.state;
    if (redirectBack) {
      return <Redirect to={link} />;
    }

    const { match: { params: { scanId, nodeId, checkType } = {} } = {} } =
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

    const {location, cloudType} = this.props;

    return (
      <div className="compliance-details">
        <SideNavigation
          navMenuCollection={this.sideNavMenuCollection}
          activeMenu={this.state.activeMenu}
        />
        <div className={divClassName}>
          <HeaderView />
          <div className="" style={{ paddingTop: '64px' }} />
          {cloudType === 'kubernetes' && (
            <div
              className="go-back-btn"
              style={{
                marginBottom: '8px',
                width: 'fit-content',
                cursor: 'pointer',
              }}
              onClick={() =>
                this.props.history.push(
                  `/compliance/${cloudType}/${scanIdFormatted}/standard/${this.props.match.params.checkType}`
                )
              }
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
          {cloudType !== 'kubernetes' && !urlSearchParams.get('resource') && location.state === undefined ? (
            <div
              className="go-back-btn"
              style={{
                marginBottom: '8px',
                width: 'fit-content',
                cursor: 'pointer',
              }}
              onClick={() =>
                this.props.history.push(
                  `/compliance/${cloudType}/${nodeId}/standard/${this.props.match.params.checkType}`
                )
              }
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
          {urlSearchParams.get('resource')?.length && urlSearchParams.get('serviceId')?.length && (
            <div
              className="go-back-btn"
              style={{
                marginBottom: '8px',
                width: 'fit-content',
                cursor: 'pointer',
              }}
              onClick={() =>
                this.props.history.push(
                  `/compliance/cloud-inventory/${cloudType}/${nodeId}/${urlSearchParams.get('serviceId')}`
                )
              }
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
                cloudType={cloudType}
                resource={urlSearchParams.get('resource')}
              />
            </div>
            <div className="test-category-report test-category-report-compliance">
              <ComplianceTestCategoryReportContainer
                nodeId={nodeId}
                scanId={scanId}
                checkType={checkType}
                cloudType={cloudType}
                resource={urlSearchParams.get('resource')}
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
              cloudType={cloudType}
              resource={urlSearchParams.get('resource')}
            />
          </div>
          <div className={contentClassName} />
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    cloudType: state.get('compliance_node_type'),
    isFiltersViewVisible: state.get('isFiltersViewVisible'),
  };
}

export default connect(mapStateToProps)(ComplianceDetailsView);
