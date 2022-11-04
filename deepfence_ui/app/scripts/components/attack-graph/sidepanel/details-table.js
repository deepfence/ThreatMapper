import { DialogContent, DialogOverlay } from '@reach/dialog';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAttackGraphNodeIssuesAction } from '../../../actions';
import { DfTableV2 } from '../../common/df-table-v2';
import AppLoader from '../../loader';
import { dateTimeFormat } from '../../../utils/time-utils';
import styles from './details-table.module.scss';
import { VulnerabilityModal } from '../../vulnerability-view/vulnerability-modal';
import { ComplianceTestModal } from '../../compliance-view/test-modal';
import { SecretScanModal } from '../../secret-scan-view/secret-scan-modal';

const TABLE_TITLES = {
  vulnerabilities: 'Vulnerabilities',
  secrets: 'Secrets',
  compliance: 'Compliance Issues',
};

export const DetailsTable = ({ onDismiss, tableType, nodeData, isSidepanelOpen }) => {
  return (
    <DialogOverlay
      className={styles.reachOverlay}
      style={{
        right: isSidepanelOpen ? undefined : 0
      }}
      isOpen
      onDismiss={() => {
        onDismiss();
      }}
      dangerouslyBypassFocusLock
      dangerouslyBypassScrollLock
    >
      <DialogContent className={styles.reachContent} aria-label="test">
        <DialogHeader
          title={TABLE_TITLES[tableType]}
          onCloseClick={() => {
            onDismiss();
          }}
        />
        {tableType === 'vulnerabilities' ? (
          <VulnerabilityTable nodeData={nodeData} />
        ) : null}
        {tableType === 'compliance' ? (
          <ComplianceTable nodeData={nodeData} />
        ) : null}
        {tableType === 'secrets' ? <SecretsTable nodeData={nodeData} /> : null}
      </DialogContent>
    </DialogOverlay>
  );
};

function DialogHeader({ title, onCloseClick }) {
  return (
    <div className={styles.headerWrapper}>
      <span className={styles.titleWrapper}>{title}</span>
      <span className={styles.dismissBtn} onClick={onCloseClick}>
        <i className="fa fa-times" />
      </span>
    </div>
  );
}

const PAGE_SIZE = 20;

function VulnerabilityTable({ nodeData }) {
  const dispatch = useDispatch();
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalState, setModalState] = useState({
    isVulnerabilityModalOpen: false,
    cveData: null,
  });

  const searchIndex =
    Object.values(nodeData.vulnerability_scan_id ?? {})?.[0] ?? 'cve';

  const { nodeIssuesLoading, nodeIssues } = useSelector(state => {
    return {
      nodeIssuesLoading: state.getIn(
        ['attackGraph', 'nodeIssues', searchIndex, 'loading'],
        true
      ),
      nodeIssues: state.getIn(
        ['attackGraph', 'nodeIssues', searchIndex, 'data'],
        null
      ),
    };
  });

  useEffect(() => {
    const params = {
      type: searchIndex,
      query: {
        from: page * PAGE_SIZE,
        size: PAGE_SIZE,
      },
      filters: {
        masked: ['false'],
        scan_id: Object.keys(nodeData.vulnerability_scan_id ?? {}),
      },
      sort_by: sortBy ?? 'cve_severity',
      sort_order: sortOrder,
      top_exploitable: nodeData.top_exploitable,
    };
    dispatch(getAttackGraphNodeIssuesAction(params));
  }, [nodeData, page, sortBy, sortOrder]);

  const onRowClick = useCallback(doc => {
    setModalState({
      isVulnerabilityModalOpen: true,
      cveData: { _source: doc.original._source },
    });
  }, []);

  if (nodeIssuesLoading && !nodeIssues) {
    return (
      <AppLoader
        style={{
          marginTop: '100px',
        }}
      />
    );
  }

  return (
    <>
      <DfTableV2
        manual
        noMargin
        showPagination
        enableSorting
        data={nodeIssues?.hits ?? []}
        totalRows={nodeIssues?.total ?? 0}
        defaultPageSize={PAGE_SIZE}
        onPageChange={page => {
          setPage(page);
        }}
        onSortChange={sortBy => {
          if (sortBy.length) {
            setSortBy(sortBy[0]?.id);
            setSortOrder(!sortBy[0].desc ? 'asc' : 'desc');
          } else {
            setSortBy(null);
            setSortOrder('desc');
          }
        }}
        onRowClick={row => onRowClick(row)}
        columns={[
          {
            id: 'cveId',
            Header: 'CVE ID',
            disableSortBy: true,
            Cell: ({ row: { original = {} } = {} }) => {
              return (
                <div className="truncate" title={original?._source?.cve_id}>
                  {original?._source?.cve_id}
                </div>
              );
            },
          },
          {
            Header: 'Severity',
            maxWidth: 150,
            id: 'cve_severity',
            accessor: row => {
              return row?._source?.cve_severity;
            },
            Cell: ({ value }) => {
              return <div className={`${value}-severity`}>{value}</div>;
            },
          },
          {
            Header: 'Package',
            disableSortBy: true,
            maxWidth: 200,
            id: 'cve_caused_by_package',
            Cell: ({ row: { original = {} } = {} }) => {
              return (
                <div
                  className="truncate"
                  title={original?._source?.cve_caused_by_package}
                >
                  {original?._source?.cve_caused_by_package}
                </div>
              );
            },
          },
          {
            Header: 'Description',
            disableSortBy: true,
            id: 'cve_description',
            Cell: ({ row: { original = {} } = {} }) => {
              return (
                <div
                  className="truncate"
                  title={original?._source?.cve_description}
                >
                  {original?._source?.cve_description}
                </div>
              );
            },
            minWidth: 350,
          },
          {
            Header: 'Link',
            id: 'cve_link',
            disableSortBy: true,
            Cell: ({ row: { original = {} } = {} }) => {
              return (
                <div className="truncate" title={original?._source?.cve_link}>
                  <a
                    href={original?._source?.cve_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {original?._source?.cve_link}
                  </a>
                </div>
              );
            },
            minWidth: 350,
          },
        ]}
      />
      {modalState.isVulnerabilityModalOpen && modalState.cveData ? (
        <VulnerabilityModal
          data={modalState.cveData}
          onRequestClose={() => {
            setModalState({
              isVulnerabilityModalOpen: false,
              cveData: null,
            });
          }}
        />
      ) : null}
    </>
  );
}

function ComplianceTable({ nodeData }) {
  const dispatch = useDispatch();
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalState, setModalState] = useState({
    isComplianceModalOpen: false,
    complianceData: null,
  });

  const searchIndex =
    Object.values(nodeData.compliance_scan_id ?? {})?.[0] ?? 'compliance';
  const isCloud = searchIndex === 'cloud-compliance-scan';

  const { nodeIssuesLoading, nodeIssues } = useSelector(state => {
    return {
      nodeIssuesLoading: state.getIn(
        ['attackGraph', 'nodeIssues', searchIndex, 'loading'],
        true
      ),
      nodeIssues: state.getIn(
        ['attackGraph', 'nodeIssues', searchIndex, 'data'],
        null
      ),
    };
  });

  useEffect(() => {
    const params = {
      type: searchIndex,
      query: {
        from: page * PAGE_SIZE,
        size: PAGE_SIZE,
      },
      filters: {
        masked: ['false'],
        status: isCloud ? 'alarm' : 'warn',
        scan_id: Object.keys(nodeData.compliance_scan_id ?? {}),
        ...(isCloud
          ? {
              resource: [nodeData.cloud_id ?? nodeData.node_id],
            }
          : {}),
      },
      sort_by: sortBy ?? 'status',
      sort_order: sortOrder,
    };
    dispatch(getAttackGraphNodeIssuesAction(params));
  }, [nodeData, page, sortBy, sortOrder, isCloud]);

  const onRowClick = useCallback(doc => {
    setModalState({
      isComplianceModalOpen: true,
      complianceData: doc.original._source,
    });
  }, []);

  if (nodeIssuesLoading && !nodeIssues) {
    return (
      <AppLoader
        style={{
          marginTop: '100px',
        }}
      />
    );
  }

  return (
    <>
      <DfTableV2
        manual
        noMargin
        showPagination
        enableSorting
        data={nodeIssues?.hits ?? []}
        totalRows={nodeIssues?.total ?? 0}
        defaultPageSize={PAGE_SIZE}
        onPageChange={page => {
          setPage(page);
        }}
        onSortChange={sortBy => {
          if (sortBy.length) {
            setSortBy(sortBy[0]?.id);
            setSortOrder(!sortBy[0].desc ? 'asc' : 'desc');
          } else {
            setSortBy(null);
            setSortOrder('desc');
          }
        }}
        onRowClick={row => onRowClick(row)}
        columns={[
          {
            Header: 'Timestamp',
            accessor: row => {
              return dateTimeFormat(row._source['@timestamp']);
            },
            id: '@timestamp',
            width: 100,
            minWidth: 50,
            Cell: ({ value }) => {
              return (
                <div className="truncate" title={value}>
                  {value}
                </div>
              );
            },
          },
          {
            Header: 'Status',
            id: 'status',
            width: 70,
            minWidth: 60,
            Cell: ({ row }) => {
              return (
                <div
                  className={`compliance-${row.original._source.compliance_check_type}-${row.original._source.status} label box`}
                >
                  {row.original._source.status}
                </div>
              );
            },
          },
          {
            Header: 'Service',
            accessor: '_source.service',
            id: 'service',
            width: 80,
            minWidth: 80,
            Cell: ({ value }) => {
              return (
                <div className="truncate" title={value}>
                  {value || '-'}
                </div>
              );
            },
          },
          {
            Header: isCloud ? 'Resource' : 'Node name',
            id: 'resource',
            minWidth: 150,
            Cell: ({ row }) => {
              return (
                <div className="truncate">
                  {row.original._source.resource ||
                    row.original._source.node_name}
                </div>
              );
            },
          },
          {
            Header: isCloud ? 'Reason' : 'Description',
            id: 'reason',
            minWidth: 400,
            Cell: ({ row }) => {
              return (
                <div className="truncate">
                  {row.original._source.reason ||
                    row.original._source.description}
                </div>
              );
            },
          },
        ]}
      />
      {modalState.isComplianceModalOpen && modalState.complianceData ? (
        <ComplianceTestModal
          data={modalState.complianceData}
          onRequestClose={() => {
            setModalState({
              isVulnerabilityModalOpen: false,
              cveData: null,
            });
          }}
        />
      ) : null}
    </>
  );
}

function SecretsTable({ nodeData }) {
  const dispatch = useDispatch();
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalState, setModalState] = useState({
    isSecretModalOpen: false,
    secretData: null,
  });

  const searchIndex =
    Object.values(nodeData.secrets_scan_id ?? {})?.[0] ?? 'secret-scan';

  const { nodeIssuesLoading, nodeIssues } = useSelector(state => {
    return {
      nodeIssuesLoading: state.getIn(
        ['attackGraph', 'nodeIssues', searchIndex, 'loading'],
        true
      ),
      nodeIssues: state.getIn(
        ['attackGraph', 'nodeIssues', searchIndex, 'data'],
        null
      ),
    };
  });

  useEffect(() => {
    const params = {
      type: searchIndex,
      query: {
        from: page * PAGE_SIZE,
        size: PAGE_SIZE,
      },
      filters: {
        masked: ['false'],
        scan_id: Object.keys(nodeData.secrets_scan_id ?? {}),
      },
      sort_by: sortBy ?? 'Severity.level',
      sort_order: sortOrder,
    };
    dispatch(getAttackGraphNodeIssuesAction(params));
  }, [nodeData, page, sortBy, sortOrder]);

  const onRowClick = useCallback(doc => {
    setModalState({
      isSecretModalOpen: true,
      secretData: { _source: doc.original },
    });
  }, []);

  if (nodeIssuesLoading && !nodeIssues) {
    return (
      <AppLoader
        style={{
          marginTop: '100px',
        }}
      />
    );
  }

  return (
    <>
      <DfTableV2
        manual
        noMargin
        showPagination
        enableSorting
        data={nodeIssues?.hits ?? []}
        totalRows={nodeIssues?.total ?? 0}
        defaultPageSize={PAGE_SIZE}
        onPageChange={page => {
          setPage(page);
        }}
        onSortChange={sortBy => {
          if (sortBy.length) {
            setSortBy(sortBy[0]?.id);
            setSortOrder(!sortBy[0].desc ? 'asc' : 'desc');
          } else {
            setSortBy(null);
            setSortOrder('desc');
          }
        }}
        onRowClick={row => onRowClick(row)}
        columns={[
          {
            Header: 'Id',
            accessor: '_id',
            Cell: row => (
              <div className="truncate" title={row.value}>
                {row.value}
              </div>
            ),
            width: 100,
            disableSortBy: true,
          },
          {
            Header: 'Filename',
            accessor: '_source.Match.full_filename',
            id: 'Match.full_filename',
            Cell: row => (
              <div className="truncate" title={row.value}>
                {row.value}
              </div>
            ),
            width: 100,
          },
          {
            Header: 'Matched content',
            accessor: '_source.Match.matched_content',
            Cell: row => (
              <div className="truncate" title={row.value}>
                {row.value}
              </div>
            ),
            width: 100,
            disableSortBy: true,
          },
          {
            Header: 'Severity',
            accessor: '_source.Severity.level',
            id: 'Severity.level',
            Cell: cell => (
              <div className={`${cell.value}-severity`}>{cell.value}</div>
            ),
            width: 90,
          },
          {
            Header: 'Rule name',
            accessor: '_source.Rule.name',
            id: 'Rule.name',
            Cell: row => (
              <div className="truncate" title={row.value}>
                {row.value}
              </div>
            ),
            minWidth: 100,
            width: 150,
          },
          {
            Header: 'Signature to match',
            accessor: '_source.Rule.signature_to_match',
            Cell: row => (
              <div className="truncate" title={row.value}>
                {row.value}
              </div>
            ),
            minWidth: 100,
            width: 300,
            disableSortBy: true,
          },
        ]}
      />
      {modalState.isSecretModalOpen && modalState.secretData ? (
        <SecretScanModal
          data={modalState.secretData}
          onRequestClose={() => {
            setModalState({
              isSecretModalOpen: false,
              secretData: null,
            });
          }}
        />
      ) : null}
    </>
  );
}
