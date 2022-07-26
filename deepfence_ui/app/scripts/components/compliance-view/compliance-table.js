import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import isNil from 'lodash/isNil';
import { DfTableV2 } from '../common/df-table-v2';
import pollable from '../common/header-view/pollable';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
import { getComplianceCloudCredentialsAction } from '../../actions/app-actions';
import AppLoader from '../common/app-loader/app-loader';

import { StartScanModalContent } from './start-scan-modal';

const ComplianceTable = withRouter(props => {
  const dispatch = useDispatch();

  const renderModalContent = (cloudType, nodeId) => (
    <StartScanModalContent cloudType={cloudType} nodeId={nodeId} />
  );

  useEffect(() => {
    const { registerPolling, startPolling } = props;

    registerPolling(initialData);
    return startPolling();
  }, []);

  const initialData = pollParams => {
    const { initiatedByPollable } = pollParams;
    const params = {
      initiatedByPollable,
      cloud_provider: props.cloudType,
    };
    dispatch(getComplianceCloudCredentialsAction(params));
  };

  const isLoading = useSelector(state => state.get('cloud_credentials_loader'));
  const accountList = useSelector(state => state.get('cloud_credentials'));

  const handleViewRules = cell => {
    const { triggerModal, cloudType } = props;
    triggerModal('GENERIC_MODAL', {
      title: `Start Compliance Scan`,
      modalContent: () =>
        renderModalContent(cloudType, cell.row.original.node_id),
      contentStyles: {
        width: '80%',
        height: '80%',
      },
    });
  };

  return (
    <div style={{ marginBottom: '75px', marginTop: '8px' }}>
      <div style={{ color: 'white' }} className="name heading">
        Account Detail
      </div>
      {isLoading === true ? (
        <AppLoader />
      ) : (
        <div style={{ padding: '0 4px' }}>
          <AccountListTable
            cloudType={props.cloudType}
            handleViewRules={handleViewRules}
            nodes={accountList?.nodes}
          />
        </div>
      )}
    </div>
  );
});

const AccountListTable = ({ nodes = [], cloudType, handleViewRules }) => {
  return (
    <DfTableV2
      noMargin
      noDataText="No accounts are configured, please use instructions above to setup an account."
      data={nodes}
      hideExpander
      renderRowSubComponent={({ row: { original } }) => {
        if (!original.nodes?.length) {
          return null;
        }
        return (
          <div
            style={{
              paddingBlock: '16px',
            }}
          >
            <AccountListTable
              nodes={original.nodes}
              cloudType={cloudType}
              handleViewRules={handleViewRules}
            />
          </div>
        );
      }}
      columns={[
        {
          Header: '',
          id: 'expander',
          Cell: ({ row }) => {
            if (row.original?.nodes?.length) {
              return (
                <span>
                  {row.isExpanded ? (
                    <span className="fa fa-minus" />
                  ) : (
                    <span className="fa fa-plus" />
                  )}
                </span>
              );
            }
            return null;
          },
          width: 35,
          disableResizing: true,
        },
        {
          Header: 'Account ID',
          accessor: 'node_name',
          width: 70,
          maxWidth: 70,
          minWidth: 70,
        },
        {
          Header: 'Cloud Provider',
          accessor: 'cloud_provider',
          width: 50,
          maxWidth: 70,
          minWidth: 50,
        },
        {
          Header: 'Active',
          accessor: 'enabled',
          Cell: row => {
            if (row.value === true) {
              return 'YES';
            }
            if (row.value === false) {
              return 'NO';
            }
            return '-';
          },
          width: 50,
          maxWidth: 70,
          minWidth: 50,
        },
        {
          Header: () => {
            return <div className="truncate">Compliance %</div>;
          },
          accessor: 'compliance_percentage',
          Cell: row => {
            if (isNil(row.value)) {
              return '-';
            }
            return <div>{Number(row.value).toFixed(0)}%</div>;
          },
          width: 60,
          maxWidth: 70,
          minWidth: 60,
        },
        {
          Header: 'Actions',
          width: 140,
          minWidth: 140,
          accessor: 'id',
          disableSortBy: true,
          Cell: cell => {
            let enableShowPrevScanButton = true;
            if (
              cell.row.original.cloud_provider?.length &&
              !cell.row.original.last_scanned_ts?.length
            ) {
              enableShowPrevScanButton = false;
            }
            return (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={e => {
                    e.stopPropagation();
                    if (cell.row.original.enabled === true) {
                      handleViewRules(cell);
                    }
                  }}
                  disabled={!cell.row.original.enabled}
                  title={
                    cell.row.original.enabled === false
                      ? 'Account is inactive'
                      : ''
                  }
                >
                  <i
                    className="fa fa-play"
                    aria-hidden="true"
                    style={{ paddingRight: '4px' }}
                  />
                  Start scan
                </button>
                <Link
                  to={`/compliance/${cloudType}/${cell.row.original.node_id}/standard`}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className="primary-btn"
                    onClick={e => e.stopPropagation()}
                    disabled={!enableShowPrevScanButton}
                    title={
                      !cell.row.original.last_scanned_ts
                        ? 'Account has never been scanned'
                        : `Last scanned at ${cell.row.original.last_scanned_ts}`
                    }
                  >
                    <i
                      className="fa fa-list-alt"
                      aria-hidden="true"
                      style={{ paddingRight: '4px' }}
                    />
                    View scan results
                  </button>
                </Link>
                {cell.row.original.cloud_provider?.length ? (
                  <Link
                    to={`/compliance/cloud-inventory/${cloudType}/${cell.row.original.node_id}`}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      className="primary-btn"
                      onClick={e => e.stopPropagation()}
                      disabled={!cell.row.original.enabled}
                      title={
                        cell.row.original.enabled === false
                          ? 'Account is inactive'
                          : ''
                      }
                    >
                      <i
                        className="fa fa-list-ol"
                        aria-hidden="true"
                        style={{ paddingRight: '4px' }}
                      />
                      View inventory
                    </button>
                  </Link>
                ) : null}
              </div>
            );
          },
        },
      ]}
    />
  );
};

export default pollable()(injectModalTrigger(ComplianceTable));
