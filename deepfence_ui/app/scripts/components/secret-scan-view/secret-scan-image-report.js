import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { useUpdateEffect } from 'react-use';
import {
  getSecretScanDataAction,
  saveImageReportTableStateAction,
} from '../../actions/app-actions';
import pollable from '../common/header-view/pollable';
import SecretScanImageReportDetails from './secret-scan-image-report-details';
import NodesFilter from '../../charts/nodes-filter';
import { DfTableV2 } from '../common/df-table-v2';

const SecretScanImageReport = props => {
  const {
    startPolling,
    stopPolling,
    registerPolling,
    updatePollParams,
    filterValues = {},
  } = props;
  const dispatch = useDispatch();
  const [redirect, setRedirect] = useState(false);
  const [link, setLink] = useState('');
  const [rowCountValue, setRowCountValue] = useState(10);

  const columns = [
    {
      Header: 'Node Type',
      accessor: 'node_type',
      Cell: row => {
        let displayValue = row.value || 'container image';
        displayValue = displayValue.replace('_', ' ');
        return displayValue;
      },
      width: 30,
    },
    {
      Header: 'Node',
      accessor: 'node_name',
      width: 90,
      Cell: row => (
        <div className="truncate" title={row.value}>
          {row.value}
        </div>
      ),
    },
    {
      Header: 'Pass Status',
      accessor: row =>
        `${row.total_count - row.error_count}/${row.total_count} PASSED`,
      Cell: ({ row, value }) => (
        <div
          className={
            row?.original?.error_count === 0
              ? 'status-success'
              : 'status-failed'
          }
        >
          {value}
        </div>
      ),
      id: 'status',
    },
  ];

  useUpdateEffect(() => {
    updatePollParams({
      filters: filterValues,
      page: 0
    });
    dispatch(saveImageReportTableStateAction({ pageNumber: 0 }));
  }, [filterValues]);

  useEffect(() => {
    // pollable: register the function which needs to be polled
    const { urlLocation: { search = '' } = {} } = props;
    registerPolling(getSecretScanImageReport);
    startPolling();
    if (search.length === 0) {
      // set save table page number to 0 if there is no search query
      // This resets the page number if user navigates to this page for the 1st time.
      // If user navigates from vulnerability details page, that sets a search query
      // and the page number is not reset. it will should previous page number.
      dispatch(saveImageReportTableStateAction({ pageNumber: 0 }));
    }

    return () => {
      stopPolling();
    };
  }, []);

  const rowClickHandler = scanId => {
    setRedirect(true);
    setLink(`/secret-scan/details/${encodeURIComponent(scanId)}`);
  };

  const tableChangeHandler = (params = {}) => {
    updatePollParams(params);
  };

  const getSecretScanImageReport = (pollParams = {}) => {
    const {
      page = 0,
      pageSize = 10,
      globalSearchQuery,
      alertPanelHistoryBound = props.alertPanelHistoryBound || {},
    } = pollParams;

    const tableFilters = pollParams.filters || filterValues;
    const nonEmptyFilters = Object.keys(tableFilters)
      .filter(key => tableFilters[key].length)
      .reduce((acc, key) => {
        // replacing back the dot which was removed redux-form as it considers that a nested field.
        acc[[key.replace('-', '.')]] = tableFilters[key];
        return acc;
      }, {});

    const params = {
      lucene_query: globalSearchQuery,
      // Conditionally adding number and time_unit fields
      ...(alertPanelHistoryBound.value
        ? { number: alertPanelHistoryBound.value.number }
        : {}),
      ...(alertPanelHistoryBound.value
        ? { time_unit: alertPanelHistoryBound.value.time_unit }
        : {}),
      filters: nonEmptyFilters,
      start_index: page ? page * pageSize : page,
      size: pageSize,
    };
    return dispatch(getSecretScanDataAction(params));
  };

  const handlePageChange = pageNumber => {
    tableChangeHandler({
      page: pageNumber,
    });
    dispatch(saveImageReportTableStateAction({ pageNumber }));
  };

  const setRowCount = e => {
    const rowCount = Number(e.target.value);
    setRowCountValue(rowCount);
  };

  useUpdateEffect(() => {
    updatePollParams({ pageSize: rowCountValue });
  }, [rowCountValue]);

  const renderSubComponent = ({ row }) => (
    <SecretScanImageReportDetails
      data={row.original.scans}
      rowClickHandler={scanId => rowClickHandler(scanId)}
      isToasterVisible={props.isToasterVisible}
      onDelete={() => getSecretScanImageReport()}
    />
  );

  if (redirect) {
    return <Redirect to={link} />;
  }

  const {
    data = [],
    total,
    savedTablePageNumber = 0, // if page number is saved, pick it else start from 0
  } = props;

  const rowCounts = [
    {
      label: 10,
      value: 10,
    },
    {
      label: 25,
      value: 25,
    },
    {
      label: 50,
      value: 50,
    },
    {
      label: 100,
      value: 100,
    },
  ];
  return (
    <div>
      <div style={{ display: 'flex' }}>
        <div className="dataTables_length d-flex justify-content-start">
          <label htmlFor="true">
            {'Show '}
            <select
              style={{
                backgroundColor: '#252525',
                color: 'white',
                borderRadius: '4px',
                borderColor: '#252525',
              }}
              onChange={e => setRowCount(e)}
            >
              {rowCounts.map(el => (
                <option key={el.value} value={el.value}>
                  {el.label}
                </option>
              ))}
            </select>
            {' Entries'}
          </label>
        </div>
        <NodesFilter resourceType="secret-scan" />
      </div>
      <DfTableV2
        data={data}
        columns={columns}
        name="secrets-scan-table"
        renderRowSubComponent={({ row }) => renderSubComponent({ row })}
        showPagination
        manual
        defaultPageSize={rowCountValue}
        page={savedTablePageNumber}
        totalRows={total}
        onPageChange={pageNumber => handlePageChange(pageNumber)}
      />
    </div>
  );
};

export default pollable()(SecretScanImageReport);
