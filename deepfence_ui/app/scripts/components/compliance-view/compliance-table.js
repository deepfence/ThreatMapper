import isNil from 'lodash/isNil';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import {
  clearStartComplianceScanErrrorAction,
  getComplianceCloudCredentialsAction,
  refreshCloudComplianceResourcesAction,
  toaster,
} from '../../actions/app-actions';
import AppLoader from '../common/app-loader/app-loader';
import { DfTableV2 } from '../common/df-table-v2';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
import pollable from '../common/header-view/pollable';

import { StartScanModalContent } from './start-scan-modal';

const ComplianceTable = withRouter(props => {
  const dispatch = useDispatch();
  const [refreshDisabledIdx, setRefreshDisabledIdx] = useState({});
  const refreshDisabledIds = Object.keys(refreshDisabledIdx);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRefreshDisabledIdx(prev => {
        const newIdx = {};
        for (const nodeId of Object.keys(prev)) {
          if (new Date().getTime() - prev[nodeId] < 10000) {
            newIdx[nodeId] = prev[nodeId];
          }
        }
        return newIdx;
      });
    }, 2000);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  function disableRefreshFor(nodeId) {
    setRefreshDisabledIdx(prev => {
      if (!prev[nodeId]) {
        return {
          ...prev,
          [nodeId]: new Date().getTime(),
        };
      }
      return prev;
    });
  }

  const renderModalContent = (cloudType, nodeId) => (
    <StartScanModalContent cloudType={cloudType} nodeId={nodeId} />
  );

  const { registerPolling, startPolling } = props;

  useEffect(() => {
    registerPolling(fetchData);
    startPolling();
  }, []);

  const fetchData = useCallback(pollParams => {
    const { initiatedByPollable } = pollParams;
    const params = {
      initiatedByPollable,
      cloud_provider: props.cloudType,
    };
    return dispatch(getComplianceCloudCredentialsAction(params));
  }, []);

  const isLoading = useSelector(state => state.get('cloud_credentials_loader'));
  const accountList = useSelector(state => state.get('cloud_credentials'));

  const handleViewRules = cell => {
    const { triggerModal, cloudType } = props;
    triggerModal('GENERIC_MODAL', {
      title: `Start Compliance Scan`,
      modalContent: () =>
        renderModalContent(cloudType, cell.row.original.node_id),
      onHide: () => {
        dispatch(clearStartComplianceScanErrrorAction());
      },
      contentStyles: {
        width: '80%',
        height: '80%',
      },
    });
  };

  const doRefresh = nodeId => {
    disableRefreshFor(nodeId);
    dispatch(refreshCloudComplianceResourcesAction({ nodeId }));
    dispatch(
      toaster('Refreshing cloud inventory. This can take up to a minute...')
    );
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
            doRefresh={doRefresh}
            nodes={withRefreshDisabledFlag(
              accountList?.nodes,
              refreshDisabledIds
            )}
            refreshDisabledIds={refreshDisabledIds}
          />
        </div>
      )}
    </div>
  );
});

function withRefreshDisabledFlag(nodes = [], refreshDisabledIds = []) {
  return nodes.map(node => {
    if (refreshDisabledIds.includes(node?.node_id)) {
      return {
        ...node,
        refreshDisabled: true,
      };
    }
    return node;
  });
}

const AccountListTable = ({
  nodes = [],
  cloudType,
  handleViewRules,
  doRefresh,
  refreshDisabledIds = [],
}) => {
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
              nodes={withRefreshDisabledFlag(
                original.nodes,
                refreshDisabledIds
              )}
              cloudType={cloudType}
              handleViewRules={handleViewRules}
              doRefresh={doRefresh}
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
          Header: 'Version',
          accessor: 'version',
          width: 50,
          maxWidth: 70,
          minWidth: 50,
        },
        {
          Header: 'Actions',
          width: 140,
          minWidth: 140,
          accessor: 'id',
          disableSortBy: true,
          Cell: cell => {
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
                  <>
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
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={e => {
                        e.stopPropagation();
                        if (cell.row.original.enabled === true) {
                          doRefresh(cell.row.original.node_id);
                        }
                      }}
                      disabled={
                        !cell.row.original.enabled ||
                        cell.row.original.refreshDisabled
                      }
                      title={
                        cell.row.original.enabled === false
                          ? 'Account is inactive'
                          : ''
                      }
                    >
                      <i
                        className="fa fa-refresh"
                        aria-hidden="true"
                        style={{ paddingRight: '4px' }}
                      />
                      Refresh
                    </button>
                  </>
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
